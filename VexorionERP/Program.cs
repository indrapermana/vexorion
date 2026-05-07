using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using QuestPDF.Infrastructure;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using VexorionERP;
using VexorionERP.Filters;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{

// QuestPDF community license — free for open-source and revenue < $1M USD/year.
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.WithProperty("app", "vexorionerp")
       .Enrich.WithProperty("env", ctx.HostingEnvironment.EnvironmentName)
       .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
       .WriteTo.File(
           path: "logs/vexorionerp-.log",
           rollingInterval: RollingInterval.Day,
           retainedFileCountLimit: 14,
           outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}");

    var lokiKey = ctx.Configuration["GrafanaLoki:ApiKey"];
    if (!string.IsNullOrWhiteSpace(lokiKey))
    {
        cfg.WriteTo.GrafanaLoki(
            uri: ctx.Configuration["GrafanaLoki:Url"] ?? "https://logs-prod-020.grafana.net",
            credentials: new LokiCredentials
            {
                Login = ctx.Configuration["GrafanaLoki:User"] ?? "1579336",
                Password = lokiKey
            },
            labels:
            [
                new LokiLabel { Key = "app", Value = "vexorionerp" },
                new LokiLabel { Key = "env", Value = ctx.HostingEnvironment.EnvironmentName }
            ]);
    }
});

const string LocalDevCorsPolicy = "LocalDevCors";
const string ProductionCorsPolicy = "ProductionCors";
const string TenantRateLimitPolicy = "tenant-fixed";

builder.Services.AddApplicationIdentity(builder.Configuration);
builder.Services.AddApplicationAuthorization();
builder.Services.Configure<ImportsOptions>(builder.Configuration.GetSection("Imports"));
builder.Services.AddMediator(options => options.ServiceLifetime = Microsoft.Extensions.DependencyInjection.ServiceLifetime.Scoped);
builder.Services.AddControllers(opts => opts.Filters.Add<LoggingActionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy(LocalDevCorsPolicy, policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "https://localhost:5173",
                "https://localhost:5174",
                "https://localhost:5175")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });

    var productionOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? [];

    options.AddPolicy(ProductionCorsPolicy, policy =>
    {
        policy.WithOrigins(productionOrigins)
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
});

var app = builder.Build();

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
    httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
    httpContext.Response.ContentType = "application/json";
    await httpContext.Response.WriteAsync("{\"message\":\"An unexpected error occurred.\"}");
}));

await app.InitializeApplicationAsync();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Item 38 — HTTPS enforcement + HSTS
app.UseHttpsRedirection();
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

app.UseCors(LocalDevCorsPolicy);
app.UseCors(ProductionCorsPolicy);

// Item 39 — apply rate limiter
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

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
