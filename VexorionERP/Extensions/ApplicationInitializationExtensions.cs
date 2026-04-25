using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using VexorionERP.Configuration;
using VexorionERP.Database;
using VexorionERP.Models.Identity;
using VexorionERP.Models.Organization;
using VexorionERP.Models.Tenancy;
using VexorionERP.Services;

namespace VexorionERP.Extensions;

public static class ApplicationInitializationExtensions
{
    public static async Task InitializeApplicationAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (dbContext.Database.IsRelational())
        {
            await dbContext.Database.MigrateAsync();
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync();
        }

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        foreach (var roleName in AppRoles.All)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role is null)
            {
                role = new IdentityRole<Guid>
                {
                    Id = Guid.NewGuid(),
                    Name = roleName,
                    NormalizedName = roleName.ToUpperInvariant()
                };

                var createResult = await roleManager.CreateAsync(role);
                if (!createResult.Succeeded)
                {
                    throw new InvalidOperationException($"Failed to create role '{roleName}': {string.Join(", ", createResult.Errors.Select(error => error.Description))}");
                }
            }

            var existingClaims = await roleManager.GetClaimsAsync(role);
            var assignedPermissions = RolePermissionMatrix.All.TryGetValue(roleName, out var permissions)
                ? permissions
                : [];

            foreach (var permission in assignedPermissions)
            {
                if (existingClaims.Any(claim => claim.Type == AppClaimTypes.Permission && claim.Value == permission))
                {
                    continue;
                }

                var claimResult = await roleManager.AddClaimAsync(role, new Claim(AppClaimTypes.Permission, permission));
                if (!claimResult.Succeeded)
                {
                    throw new InvalidOperationException($"Failed to add permission '{permission}' to role '{roleName}': {string.Join(", ", claimResult.Errors.Select(error => error.Description))}");
                }
            }
        }

        await SeedBootstrapTenantAsync(scope.ServiceProvider, dbContext);
    }

    private static async Task SeedBootstrapTenantAsync(IServiceProvider serviceProvider, AppDbContext dbContext)
    {
        var bootstrapOptions = serviceProvider.GetRequiredService<IOptions<BootstrapOptions>>().Value;
        if (!bootstrapOptions.Enabled)
        {
            return;
        }

        var normalizedTenantCode = bootstrapOptions.Tenant.Code.Trim().ToUpperInvariant();
        var existingTenant = await dbContext.Tenants.FirstOrDefaultAsync(x => x.Code.ToUpper() == normalizedTenantCode);
        if (existingTenant is not null)
        {
            return;
        }

        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();
        var auditLogger = serviceProvider.GetRequiredService<IAuditLogger>();
        var bootstrapPassword = bootstrapOptions.AdminUser.Password;
        if (string.IsNullOrWhiteSpace(bootstrapPassword))
        {
            bootstrapPassword = Environment.GetEnvironmentVariable("VEXORIONERP_BOOTSTRAP_ADMIN_PASSWORD");
        }

        if (string.IsNullOrWhiteSpace(bootstrapPassword))
        {
            throw new InvalidOperationException("Bootstrap seeding is enabled, but no admin password was provided. Set Bootstrap:AdminUser:Password or the VEXORIONERP_BOOTSTRAP_ADMIN_PASSWORD environment variable.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        var tenant = new Tenant
        {
            Name = bootstrapOptions.Tenant.Name.Trim(),
            Code = bootstrapOptions.Tenant.Code.Trim(),
            Domain = string.IsNullOrWhiteSpace(bootstrapOptions.Tenant.Domain) ? null : bootstrapOptions.Tenant.Domain.Trim()
        };

        var company = new Company
        {
            TenantId = tenant.Id,
            Name = bootstrapOptions.Company.Name.Trim(),
            Code = bootstrapOptions.Company.Code.Trim()
        };

        var adminUser = new User
        {
            TenantId = tenant.Id,
            UserName = bootstrapOptions.AdminUser.UserName.Trim(),
            Email = bootstrapOptions.AdminUser.Email.Trim(),
            FirstName = bootstrapOptions.AdminUser.FirstName.Trim(),
            LastName = bootstrapOptions.AdminUser.LastName.Trim(),
            EmailConfirmed = true,
            IsActive = true
        };

        dbContext.Tenants.Add(tenant);
        dbContext.Companies.Add(company);

        var createResult = await userManager.CreateAsync(adminUser, bootstrapPassword);
        if (!createResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to create bootstrap admin user: {string.Join(", ", createResult.Errors.Select(error => error.Description))}");
        }

        var roleResult = await userManager.AddToRolesAsync(adminUser, [AppRoles.SystemAdmin, AppRoles.TenantAdmin]);
        if (!roleResult.Succeeded)
        {
            throw new InvalidOperationException($"Failed to assign bootstrap roles: {string.Join(", ", roleResult.Errors.Select(error => error.Description))}");
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();
        await auditLogger.LogAsync("bootstrap.seeded", tenant.Id, adminUser.Id, adminUser.Id, nameof(Tenant), tenant.Id.ToString(), "Bootstrap tenant and admin user created.");
    }
}