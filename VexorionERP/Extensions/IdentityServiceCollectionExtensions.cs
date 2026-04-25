using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Configuration;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Identity;
using VexorionERP.Models.Identity;
using VexorionERP.Services;
using VexorionERP.Tenancy;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace VexorionERP.Extensions;

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
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentTenantProvider, HttpContextCurrentTenantProvider>();
        services.AddScoped<IUserClaimsPrincipalFactory<User>, AppUserClaimsPrincipalFactory>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IAuditLogger, AuditLogger>();
        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<ICompanyCommandService, CompanyCommandService>();
        services.AddScoped<ICompanyQueryService, CompanyQueryService>();
        services.AddScoped<ICustomerCommandService, CustomerCommandService>();
        services.AddScoped<ICustomerQueryService, CustomerQueryService>();
        services.AddScoped<IDepartmentCommandService, DepartmentCommandService>();
        services.AddScoped<IDepartmentQueryService, DepartmentQueryService>();
        services.AddScoped<IEmployeeCommandService, EmployeeCommandService>();
        services.AddScoped<IEmployeeQueryService, EmployeeQueryService>();
        services.AddScoped<IInventoryAdjustmentCommandService, InventoryAdjustmentCommandService>();
        services.AddScoped<IInventoryAdjustmentLineCommandService, InventoryAdjustmentLineCommandService>();
        services.AddScoped<IInventoryAdjustmentQueryService, InventoryAdjustmentQueryService>();
        services.AddScoped<IInventoryBalanceCommandService, InventoryBalanceCommandService>();
        services.AddScoped<IInventoryBalanceQueryService, InventoryBalanceQueryService>();
        services.AddScoped<IInventoryMovementPostingService, InventoryMovementPostingService>();
        services.AddScoped<IInvoiceCommandService, InvoiceCommandService>();
        services.AddScoped<IInvoiceLineCommandService, InvoiceLineCommandService>();
        services.AddScoped<IInvoiceLineQueryService, InvoiceLineQueryService>();
        services.AddScoped<IInvoiceQueryService, InvoiceQueryService>();
        services.AddScoped<IProductCommandService, ProductCommandService>();
        services.AddScoped<IProductQueryService, ProductQueryService>();
        services.AddScoped<IPurchaseOrderCommandService, PurchaseOrderCommandService>();
        services.AddScoped<IPurchaseOrderLineCommandService, PurchaseOrderLineCommandService>();
        services.AddScoped<IPurchaseOrderLineQueryService, PurchaseOrderLineQueryService>();
        services.AddScoped<IPurchaseOrderQueryService, PurchaseOrderQueryService>();
        services.AddScoped<IRoleManagementService, RoleManagementService>();
        services.AddScoped<ISalesOrderCommandService, SalesOrderCommandService>();
        services.AddScoped<ISalesOrderLineCommandService, SalesOrderLineCommandService>();
        services.AddScoped<ISalesOrderLineQueryService, SalesOrderLineQueryService>();
        services.AddScoped<ISalesOrderQueryService, SalesOrderQueryService>();
        services.AddScoped<IStockTransferCommandService, StockTransferCommandService>();
        services.AddScoped<IStockTransferLineCommandService, StockTransferLineCommandService>();
        services.AddScoped<IStockTransferQueryService, StockTransferQueryService>();
        services.AddScoped<ISupplierCommandService, SupplierCommandService>();
        services.AddScoped<ISupplierQueryService, SupplierQueryService>();
        services.AddScoped<ITenantOnboardingService, TenantOnboardingService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IWarehouseCommandService, WarehouseCommandService>();
        services.AddScoped<IWarehouseQueryService, WarehouseQueryService>();

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