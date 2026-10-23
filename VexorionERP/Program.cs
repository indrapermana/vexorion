using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Infrastructure;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using VexorionERP;
using VexorionERP.Filters;
using VexorionERP.Middleware;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{

// QuestPDF community license — free for open-source and revenue < $1M USD/year.
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);
var applicationOperation = args.GetApplicationOperation();

var injectedPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(injectedPort))
{
    if (!int.TryParse(injectedPort, out var port) || port is < 1 or > 65535)
    {
        throw new InvalidOperationException("PORT must be a valid TCP port number.");
    }

    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

if (builder.Environment.IsEnvironment("Testing"))
{
    builder.Configuration["ConnectionStrings:DefaultConnection"] ??=
        "Host=localhost;Database=ignored;Username=ignored;Password=ignored";
    builder.Configuration["Jwt:Issuer"] ??= "vexorion-tests";
    builder.Configuration["Jwt:Audience"] ??= "vexorion-tests";
    builder.Configuration["Jwt:SecretKey"] ??= Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
}

builder.Configuration.UsePrivilegedConnectionForOperation(builder.Environment, applicationOperation);
ProductionConfigurationValidator.Validate(builder.Configuration, builder.Environment, applicationOperation);

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.WithProperty("app", "vexorionerp")
       .Enrich.WithProperty("env", ctx.HostingEnvironment.EnvironmentName)
       .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}");

    if (ctx.Configuration.GetValue("Logging:File:Enabled", ctx.HostingEnvironment.IsDevelopment()))
    {
        cfg.WriteTo.File(
           path: "logs/vexorionerp-.log",
           rollingInterval: RollingInterval.Day,
           retainedFileCountLimit: 14,
           outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}");
    }

    var lokiKey = ctx.Configuration["GrafanaLoki:ApiKey"];
    if (!string.IsNullOrWhiteSpace(lokiKey))
    {
        var lokiUser = ctx.Configuration["GrafanaLoki:User"];
        if (string.IsNullOrWhiteSpace(lokiUser))
        {
            throw new InvalidOperationException(
                "GrafanaLoki:User is required when GrafanaLoki:ApiKey is configured.");
        }

        cfg.WriteTo.GrafanaLoki(
            uri: ctx.Configuration["GrafanaLoki:Url"] ?? "https://logs-prod-020.grafana.net",
            credentials: new LokiCredentials
            {
                Login = lokiUser,
                Password = lokiKey
            },
            labels:
            [
                new LokiLabel { Key = "app", Value = "vexorionerp" },
                new LokiLabel { Key = "env", Value = ctx.HostingEnvironment.EnvironmentName }
            ]);
    }
});

const string CorsPolicy = "CorsPolicy";
const string ShortLivedAuthorizedGetPolicy = "ShortLivedAuthorizedGet";
const string TenantRateLimitPolicy = "tenant-fixed";
const string ClientDiagnosticsRateLimitPolicy = "client-diagnostics";
const string PasswordResetRateLimitPolicy = "password-reset";

builder.Services.AddApplicationIdentity(builder.Configuration);
builder.Services.AddApplicationAuthorization();
builder.Services.Configure<ImportsOptions>(builder.Configuration.GetSection("Imports"));
builder.Services.AddMediator(options => options.ServiceLifetime = Microsoft.Extensions.DependencyInjection.ServiceLifetime.Scoped);
builder.Services.AddControllers(opts => opts.Filters.Add<LoggingActionFilter>());
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
        new BadRequestObjectResult(ApiProblemDetailsFactory.CreateValidation(context.HttpContext, context.ModelState));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks()
    .AddCheck(
        "self",
        () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy(),
        tags: ["live"])
    .AddCheck<DatabaseReadinessHealthCheck>(
        "database",
        tags: ["ready"],
        timeout: TimeSpan.FromSeconds(5));
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = builder.Configuration.GetValue<long?>("Caching:MemoryCacheEntryLimit") ?? 1024;
});
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy(ShortLivedAuthorizedGetPolicy, policy =>
    {
        policy.Expire(TimeSpan.FromSeconds(30))
            .SetVaryByHeader("Authorization")
            .SetVaryByQuery("*");
    });
});

var defaultCorsOrigins = new[]
{
    "https://app.vexorionerp.com",
    "https://admin.vexorionerp.com",
    "https://pos.vexorionerp.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://localhost:5173",
    "https://localhost:5174",
    "https://localhost:5175"
};

var sectionOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

var flatOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

var allowedOrigins = defaultCorsOrigins
    .Concat(sectionOrigins)
    .Concat(flatOrigins)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Item 39 — fixed-window rate limiting per tenant/IP
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter(TenantRateLimitPolicy, limiter =>
    {
        limiter.Window = TimeSpan.FromSeconds(10);
        limiter.PermitLimit = 200;
        limiter.QueueLimit = 0;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.AddPolicy(PasswordResetRateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(10),
                PermitLimit = 10,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));
    options.AddPolicy(ClientDiagnosticsRateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 20,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));
});

var app = builder.Build();

if (applicationOperation != ApplicationOperation.Run)
{
    await app.RunApplicationOperationAsync(applicationOperation);
    return;
}

await app.ValidateApplicationRuntimeAsync();

app.UseSerilogRequestLogging(opts =>
{
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
});

// Global exception handler — logs unhandled exceptions before returning 500
app.UseExceptionHandler(errorApp => errorApp.Run(async httpContext =>
{
    var feature = httpContext.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    if (feature?.Error is { } ex)
    {
        Log.Error(ex, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
    }
    var problem = ApiProblemDetailsFactory.Create(httpContext, StatusCodes.Status500InternalServerError);
    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await httpContext.Response.WriteAsJsonAsync(problem);
}));

// Ensure framework-generated 401/403/404/429 responses use the same API error contract.
app.UseStatusCodePages(async statusCodeContext =>
{
    var httpContext = statusCodeContext.HttpContext;
    var statusCode = httpContext.Response.StatusCode;
    var problem = ApiProblemDetailsFactory.Create(httpContext, statusCode);
    await httpContext.Response.WriteAsJsonAsync(problem);
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Cloud Run terminates TLS and forwards HTTP to the container. It already redirects
// public HTTP requests, so deployment configuration disables the application redirect.
if (app.Configuration.GetValue("Security:UseHttpsRedirection", true))
{
    app.UseHttpsRedirection();
}
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// Item 37 — Content Security Policy
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors(CorsPolicy);
app.UseOutputCache();

// Item 39 — apply rate limiter
app.UseRateLimiter();

app.UseAuthentication();

// Item 40 — Wrap authorization so policy denials that short-circuit the pipeline are audited.
app.UseAuthorizationBoundaryAudit();
app.UseAuthorization();

// Item 41 — Tenant module access control enforces project/document/employee toggles
app.UseTenantModuleAccessControl();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});
app.MapControllers().RequireRateLimiting(TenantRateLimitPolicy);

app.Run();

}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;
