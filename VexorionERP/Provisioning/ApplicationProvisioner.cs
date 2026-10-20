using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

public sealed class ApplicationProvisioner(
    AppDbContext dbContext,
    RoleManager<IdentityRole<Guid>> roleManager,
    UserManager<User> userManager,
    IAuditLogger auditLogger,
    IOptions<BootstrapOptions> bootstrapOptions,
    IOptions<TenantGovernanceDefaultsOptions> governanceOptions) : IApplicationProvisioner
{
    public async Task BootstrapAsync(CancellationToken cancellationToken = default)
    {
        var options = bootstrapOptions.Value;
        ValidateBootstrapOptions(options);

        await ReconcileRolesAsync(cancellationToken);
        var (tenant, adminUser, created) = await ReconcileBootstrapIdentityAsync(options, cancellationToken);
        await ReconcileGovernanceDefaultsAsync(tenant.Id, cancellationToken);

        if (created)
        {
            await auditLogger.LogAsync(
                "bootstrap.seeded",
                tenant.Id,
                adminUser.Id,
                adminUser.Id,
                nameof(Tenant),
                tenant.Id.ToString(),
                "Bootstrap tenant and admin user created.");
        }
    }

    private async Task ReconcileRolesAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

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

                EnsureSucceeded(await roleManager.CreateAsync(role), $"create role '{roleName}'");
            }

            var existingClaims = await roleManager.GetClaimsAsync(role);
            var permissions = RolePermissionMatrix.All.TryGetValue(roleName, out var assigned)
                ? assigned
                : [];

            foreach (var permission in permissions)
            {
                if (existingClaims.Any(claim =>
                        claim.Type == AppClaimTypes.Permission && claim.Value == permission))
                {
                    continue;
                }

                EnsureSucceeded(
                    await roleManager.AddClaimAsync(role, new Claim(AppClaimTypes.Permission, permission)),
                    $"add permission '{permission}' to role '{roleName}'");
            }
        }
    }

    private async Task<(Tenant Tenant, User AdminUser, bool Created)> ReconcileBootstrapIdentityAsync(
        BootstrapOptions options,
        CancellationToken cancellationToken)
    {
        var tenantCode = options.Tenant.Code.Trim();
        var companyCode = options.Company.Code.Trim();
        var normalizedUserName = userManager.NormalizeName(options.AdminUser.UserName.Trim());
        var normalizedEmail = userManager.NormalizeEmail(options.AdminUser.Email.Trim());

        var tenant = await dbContext.Tenants.SingleOrDefaultAsync(
            x => x.Code.ToUpper() == tenantCode.ToUpper(), cancellationToken);
        var userNameMatch = await dbContext.Users.SingleOrDefaultAsync(
            x => x.NormalizedUserName == normalizedUserName, cancellationToken);
        var emailMatch = await dbContext.Users.SingleOrDefaultAsync(
            x => x.NormalizedEmail == normalizedEmail, cancellationToken);

        if (userNameMatch is not null && emailMatch is not null && userNameMatch.Id != emailMatch.Id)
        {
            throw new InvalidOperationException(
                "Bootstrap identity conflict: the configured username and email belong to different users.");
        }

        var adminUser = userNameMatch ?? emailMatch;
        if (tenant is null && adminUser is not null)
        {
            throw new InvalidOperationException(
                "Bootstrap identity conflict: the configured admin username or email already belongs to another tenant.");
        }

        var created = tenant is null || adminUser is null;
        IDbContextTransaction? transaction = null;
        if (dbContext.Database.IsRelational())
        {
            transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        }

        try
        {
            if (tenant is null)
            {
                tenant = new Tenant
                {
                    Name = options.Tenant.Name.Trim(),
                    Code = tenantCode,
                    Domain = NormalizeOptional(options.Tenant.Domain)
                };
                dbContext.Tenants.Add(tenant);
            }
            else if (!string.Equals(tenant.Name, options.Tenant.Name.Trim(), StringComparison.Ordinal) ||
                     !string.Equals(NormalizeOptional(tenant.Domain), NormalizeOptional(options.Tenant.Domain), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Bootstrap tenant conflict: tenant code '{tenantCode}' exists with different identity data.");
            }

            var company = await dbContext.Companies.SingleOrDefaultAsync(
                x => x.TenantId == tenant.Id && x.Code.ToUpper() == companyCode.ToUpper(), cancellationToken);
            if (company is null)
            {
                dbContext.Companies.Add(new Company
                {
                    TenantId = tenant.Id,
                    Name = options.Company.Name.Trim(),
                    Code = companyCode
                });
            }
            else if (!string.Equals(company.Name, options.Company.Name.Trim(), StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"Bootstrap company conflict: company code '{companyCode}' exists with a different name.");
            }

            if (adminUser is null)
            {
                adminUser = new User
                {
                    TenantId = tenant.Id,
                    UserName = options.AdminUser.UserName.Trim(),
                    Email = options.AdminUser.Email.Trim(),
                    FirstName = options.AdminUser.FirstName.Trim(),
                    LastName = options.AdminUser.LastName.Trim(),
                    EmailConfirmed = true,
                    IsActive = true
                };

                EnsureSucceeded(
                    await userManager.CreateAsync(adminUser, options.AdminPassword!),
                    "create bootstrap admin user");
            }
            else if (adminUser.TenantId != tenant.Id ||
                     !string.Equals(adminUser.NormalizedUserName, normalizedUserName, StringComparison.Ordinal) ||
                     !string.Equals(adminUser.NormalizedEmail, normalizedEmail, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "Bootstrap identity conflict: the configured admin does not match the existing tenant user.");
            }

            var assignedRoles = await userManager.GetRolesAsync(adminUser);
            var missingRoles = new[] { AppRoles.SystemAdmin, AppRoles.TenantAdmin }
                .Except(assignedRoles, StringComparer.Ordinal)
                .ToArray();
            if (missingRoles.Length > 0)
            {
                EnsureSucceeded(await userManager.AddToRolesAsync(adminUser, missingRoles), "assign bootstrap roles");
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            return (tenant, adminUser, created);
        }
        catch
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            throw;
        }
        finally
        {
            if (transaction is not null)
            {
                await transaction.DisposeAsync();
            }
        }
    }

    private async Task ReconcileGovernanceDefaultsAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var options = governanceOptions.Value;

        if (!await dbContext.TenantModuleConfigs.AnyAsync(x => x.TenantId == tenantId, cancellationToken))
        {
            dbContext.TenantModuleConfigs.Add(new TenantModuleConfig
            {
                TenantId = tenantId,
                ProjectManagementEnabled = options.Modules.ProjectManagementEnabled,
                DocumentManagementEnabled = options.Modules.DocumentManagementEnabled,
                EmployeeManagementEnabled = options.Modules.EmployeeManagementEnabled,
                SalesEnabled = options.Modules.SalesEnabled,
                PurchasingEnabled = options.Modules.PurchasingEnabled,
                InventoryEnabled = options.Modules.InventoryEnabled
            });
        }

        if (!await dbContext.TenantPlans.AnyAsync(x => x.TenantId == tenantId, cancellationToken))
        {
            dbContext.TenantPlans.Add(new TenantPlan
            {
                TenantId = tenantId,
                PlanCode = options.Plan.PlanCode.Trim().ToUpperInvariant(),
                PlanName = options.Plan.PlanName.Trim(),
                MaxStorageBytes = options.Plan.MaxStorageBytes,
                MaxFileSizeBytes = options.Plan.MaxFileSizeBytes,
                WarningThresholdPercent = options.Plan.WarningThresholdPercent,
                SoftBlockThresholdPercent = options.Plan.SoftBlockThresholdPercent,
                HardBlockThresholdPercent = options.Plan.HardBlockThresholdPercent,
                EffectiveFromUtc = DateTime.UtcNow,
                IsDefault = true
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateBootstrapOptions(BootstrapOptions options)
    {
        if (!string.Equals(options.Tenant.Code.Trim(), "vexorionerp", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Bootstrap:Tenant:Code must be 'vexorionerp'.");
        }

        var requiredValues = new Dictionary<string, string?>
        {
            ["Bootstrap:Tenant:Name"] = options.Tenant.Name,
            ["Bootstrap:Company:Name"] = options.Company.Name,
            ["Bootstrap:Company:Code"] = options.Company.Code,
            ["Bootstrap:AdminUser:UserName"] = options.AdminUser.UserName,
            ["Bootstrap:AdminUser:Email"] = options.AdminUser.Email,
            ["Bootstrap:AdminPassword"] = options.AdminPassword
        };

        var missing = requiredValues
            .Where(pair => string.IsNullOrWhiteSpace(pair.Value))
            .Select(pair => pair.Key)
            .ToArray();
        if (missing.Length > 0)
        {
            throw new InvalidOperationException(
                $"Bootstrap configuration is incomplete. Missing: {string.Join(", ", missing)}.");
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void EnsureSucceeded(IdentityResult result, string operation)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to {operation}: {string.Join(", ", result.Errors.Select(error => error.Description))}");
        }
    }
}
