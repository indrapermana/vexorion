using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using VexorionERP;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace VexorionERP;

public static class IdentityServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationIdentity(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("JWT configuration was not found.");
        if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) || jwtOptions.SecretKey.Length < 32)
        {
            throw new InvalidOperationException("JWT secret key must be configured and be at least 32 characters long.");
        }

        services.Configure<BootstrapOptions>(configuration.GetSection(BootstrapOptions.SectionName));
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<TenantGovernanceDefaultsOptions>(configuration.GetSection(TenantGovernanceDefaultsOptions.SectionName));
        services.Configure<TenantModuleRolloutOptions>(configuration.GetSection(TenantModuleRolloutOptions.SectionName));
        services.Configure<DocumentSecurityOptions>(configuration.GetSection(DocumentSecurityOptions.SectionName));
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));
        services.AddHttpContextAccessor();

        List<Type> types = typeof(ProductCommandService).Assembly.GetTypes().AsParallel()
                .Where(type => !type.IsAbstract && !type.IsInterface).ToList();

        foreach (Type type in types)
        {
            Type[] serviceInterfaces = type.GetInterfaces()
                .Where(interfaceType =>
                    interfaceType.IsGenericType &&
                    (interfaceType.GetGenericTypeDefinition() == typeof(ICommandService<>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(ILineCommandService<,>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(IQueryService<>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(IInvoicePaymentQueryService<>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(IFilteredQueryService<,>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(IChildQueryService<,>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(ILineQueryService<,>)
                    || interfaceType.GetGenericTypeDefinition() == typeof(IImportExecutor<>)))
                .ToArray();

            if (serviceInterfaces.Length == 0)
            {
                continue;
            }

            foreach (Type serviceInterface in serviceInterfaces)
            {
                services.AddScoped(serviceInterface, type);
                // Also register as the non-generic IImportExecutor so ImportJobService
                // can resolve IEnumerable<IImportExecutor> for its dispatch dictionary.
                if (serviceInterface.IsGenericType &&
                    serviceInterface.GetGenericTypeDefinition() == typeof(IImportExecutor<>))
                {
                    services.AddScoped(typeof(IImportExecutor), type);
                }
            }
        }

        services.AddScoped<ICurrentTenantProvider, HttpContextCurrentTenantProvider>();
        services.AddScoped<ITenantMemoryCache, TenantMemoryCache>();
        services.AddScoped<IUserClaimsPrincipalFactory<User>, AppUserClaimsPrincipalFactory>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IAuditLogger, AuditLogger>();
        services.AddScoped<IAuditLogQueryService, AuditLogQueryService>();
        services.AddScoped<IProjectTimelineQueryService, ProjectTimelineQueryService>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<IPasswordResetService, PasswordResetService>();
        services.AddHttpClient<IEmailSender, ResendEmailSender>(client =>
        {
            client.BaseAddress = new Uri("https://api.resend.com/");
            client.Timeout = TimeSpan.FromSeconds(10);
        }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            ConnectTimeout = TimeSpan.FromSeconds(4),
            // Hosts without working IPv6 would otherwise stall on the first AAAA address until the request times out.
            ConnectCallback = async (context, cancellationToken) =>
            {
                var addresses = (await System.Net.Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken))
                    .OrderBy(address => address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 0 : 1)
                    .ToArray();
                Exception? lastError = null;
                foreach (var address in addresses)
                {
                    var socket = new System.Net.Sockets.Socket(address.AddressFamily, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp) { NoDelay = true };
                    try
                    {
                        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                        attempt.CancelAfter(TimeSpan.FromSeconds(3));
                        await socket.ConnectAsync(new System.Net.IPEndPoint(address, context.DnsEndPoint.Port), attempt.Token);
                        return new System.Net.Sockets.NetworkStream(socket, ownsSocket: true);
                    }
                    catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                    {
                        socket.Dispose();
                        lastError = ex;
                    }
                }

                throw new HttpRequestException($"Could not connect to {context.DnsEndPoint.Host}.", lastError);
            }
        });
        services.AddScoped<IInventoryMovementPostingService, InventoryMovementPostingService>();
        services.AddScoped<IProductPurchasePriceHistoryQueryService, ProductPurchasePriceHistoryQueryService>();
        services.AddScoped<IPostingService, PostingService>();
        services.AddScoped<INumberingService, NumberingService>();
        services.AddScoped<IInvoiceApprovalService, InvoiceApprovalService>();
        services.AddScoped<IReportingService, ReportingService>();
        services.AddScoped<IInvoiceCommandService, InvoiceCommandService>();
        services.AddScoped<IProductImageCommandService, ProductImageCommandService>();
        services.AddScoped<IPurchaseReceiptPostingService, PurchaseReceiptCommandService>();
        services.AddScoped<IRoleManagementService, RoleManagementService>();
        services.AddScoped<ISalesShipmentPostingService, SalesShipmentCommandService>();
        AddStorageServices(services, configuration);
        services.AddScoped<IStorageAccountingService, StorageAccountingService>();
        services.AddScoped<IDocumentMalwareScanner, ClamAvDocumentMalwareScanner>();
        services.AddScoped<IDocumentUploadSecurityService, DocumentUploadSecurityService>();
        services.AddScoped<ProjectDocumentCommandService>();
        services.AddScoped<DocumentDataLoader>();
        services.AddScoped<IImportWorkbookService, ImportWorkbookService>();
        services.AddScoped<IImportValidationEngine, ImportValidationEngine>();
        services.AddScoped<IImportJobService, ImportJobService>();
        services.AddScoped<IDocumentRendererService, DocumentRendererService>();
        services.AddScoped<IGeneratedDocumentService, GeneratedDocumentService>();
        services.AddScoped<ITenantStorageCleanupService, TenantStorageCleanupService>();
        services.AddScoped<ITenantOnboardingService, TenantOnboardingService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<SalesInvoiceCommandService>();
        services.TryAddScoped<SalesShipmentCommandService>();
        services.TryAddScoped<CustomerPaymentCommandService>();
        services.TryAddSingleton<IPosCheckoutTransactionObserver, NoOpPosCheckoutTransactionObserver>();
        services.AddScoped<IPosCheckoutService, PosCheckoutService>();
        services.AddScoped<IPosRefundService, PosRefundService>();
        services.AddScoped<IApplicationProvisioner, ApplicationProvisioner>();
        services.AddScoped<IApplicationRuntimeValidator, ApplicationRuntimeValidator>();

        services.AddDbContext<AppDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString);
        });

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services
            .AddIdentityCore<User>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;
                options.Password.RequiredUniqueChars = 3;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.SignIn.RequireConfirmedEmail = false;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager<SignInManager<User>>()
            .AddDefaultTokenProviders();

        return services;
    }

    private static void AddStorageServices(IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration[$"{StorageOptions.SectionName}:Provider"];
        if (string.IsNullOrWhiteSpace(provider) ||
            provider.Equals(StorageProviders.AzureBlob, StringComparison.OrdinalIgnoreCase))
        {
            services.AddScoped<IProductImageStorageService, AzureBlobProductImageStorageService>();
            services.AddScoped<IDocumentStorageService, AzureBlobDocumentStorageService>();
            return;
        }

        if (!provider.Equals(StorageProviders.R2, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Unsupported storage provider '{provider}'. Use '{StorageProviders.AzureBlob}' or '{StorageProviders.R2}'.");
        }

        var r2 = configuration.GetSection($"{StorageOptions.SectionName}:R2").Get<R2StorageOptions>() ?? new();
        var endpoint = $"https://{r2.AccountId}.r2.cloudflarestorage.com";
        services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
            new BasicAWSCredentials(r2.AccessKeyId, r2.SecretAccessKey),
            new AmazonS3Config
            {
                ServiceURL = endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = "auto",
            }));
        services.AddSingleton<IR2ObjectClient, R2ObjectClient>();
        services.AddScoped<IProductImageStorageService, R2ProductImageStorageService>();
        services.AddScoped<IDocumentStorageService, R2DocumentStorageService>();
    }
}
