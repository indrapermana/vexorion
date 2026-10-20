using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<TenantGovernanceDefaultsOptions>(configuration.GetSection(TenantGovernanceDefaultsOptions.SectionName));
        services.Configure<TenantModuleRolloutOptions>(configuration.GetSection(TenantModuleRolloutOptions.SectionName));
        services.Configure<DocumentSecurityOptions>(configuration.GetSection(DocumentSecurityOptions.SectionName));
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
        services.AddScoped<IProductImageStorageService, AzureBlobProductImageStorageService>();
        services.AddScoped<IDocumentStorageService, AzureBlobDocumentStorageService>();
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
        services.AddScoped<ITenantOnboardingService, TenantOnboardingService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<SalesInvoiceCommandService>();
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
}
