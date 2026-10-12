using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class TenantOnboardingService(
    AppDbContext dbContext,
    UserManager<User> userManager,
    IAuditLogger auditLogger,
    IOptions<TenantGovernanceDefaultsOptions> defaultsOptions) : ITenantOnboardingService
{
    private readonly TenantGovernanceDefaultsOptions _defaultsOptions = defaultsOptions.Value;

    public async Task<ServiceResult<OnboardTenantResponse>> OnboardAsync(OnboardTenantRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default)
    {
        var hasExistingTenants = await dbContext.Tenants.AnyAsync(cancellationToken);
        if (hasExistingTenants && !principal.IsInRole(AppRoles.SystemAdmin))
        {
            return ServiceResult<OnboardTenantResponse>.Failure(StatusCodes.Status403Forbidden, "Forbidden.");
        }

        var tenantCode = request.TenantCode.Trim().ToUpperInvariant();
        var tenantExists = await dbContext.Tenants.AnyAsync(x => x.Code.ToUpper() == tenantCode, cancellationToken);
        if (tenantExists)
        {
            return ServiceResult<OnboardTenantResponse>.Failure(StatusCodes.Status409Conflict, "Tenant code already exists.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var tenant = new Tenant
        {
            Name = request.TenantName.Trim(),
            Code = request.TenantCode.Trim(),
            Domain = string.IsNullOrWhiteSpace(request.Domain) ? null : request.Domain.Trim()
        };

        var company = new Company
        {
            TenantId = tenant.Id,
            Name = request.CompanyName.Trim(),
            Code = request.CompanyCode.Trim()
        };

        var adminUser = new User
        {
            TenantId = tenant.Id,
            UserName = request.AdminUserName.Trim(),
            Email = request.AdminEmail.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            EmailConfirmed = true,
            IsActive = true
        };

        dbContext.Tenants.Add(tenant);
        dbContext.Companies.Add(company);

        if (_defaultsOptions.CreateDefaultsOnTenantOnboarding)
        {
            dbContext.TenantModuleConfigs.Add(new TenantModuleConfig
            {
                TenantId = tenant.Id,
                ProjectManagementEnabled = _defaultsOptions.Modules.ProjectManagementEnabled,
                DocumentManagementEnabled = _defaultsOptions.Modules.DocumentManagementEnabled,
                EmployeeManagementEnabled = _defaultsOptions.Modules.EmployeeManagementEnabled,
                SalesEnabled = _defaultsOptions.Modules.SalesEnabled,
                PurchasingEnabled = _defaultsOptions.Modules.PurchasingEnabled,
                InventoryEnabled = _defaultsOptions.Modules.InventoryEnabled
            });

            dbContext.TenantPlans.Add(new TenantPlan
            {
                TenantId = tenant.Id,
                PlanCode = _defaultsOptions.Plan.PlanCode.Trim().ToUpperInvariant(),
                PlanName = _defaultsOptions.Plan.PlanName.Trim(),
                MaxStorageBytes = _defaultsOptions.Plan.MaxStorageBytes,
                MaxFileSizeBytes = _defaultsOptions.Plan.MaxFileSizeBytes,
                WarningThresholdPercent = _defaultsOptions.Plan.WarningThresholdPercent,
                SoftBlockThresholdPercent = _defaultsOptions.Plan.SoftBlockThresholdPercent,
                HardBlockThresholdPercent = _defaultsOptions.Plan.HardBlockThresholdPercent,
                EffectiveFromUtc = DateTime.UtcNow,
                IsDefault = true
            });
        }

        var createResult = await userManager.CreateAsync(adminUser, request.AdminPassword);
        if (!createResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ServiceResult<OnboardTenantResponse>.ValidationFailure(createResult.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        // First tenant admin gets SystemAdmin role; subsequent ones get TenantAdmin only
        var rolesToAssign = hasExistingTenants 
            ? new[] { AppRoles.TenantAdmin } 
            : new[] { AppRoles.SystemAdmin, AppRoles.TenantAdmin };
        
        await userManager.AddToRolesAsync(adminUser, rolesToAssign);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var actorUserId = userManager.GetUserId(principal);
        await auditLogger.LogAsync("tenants.onboarded", tenant.Id, actorUserId is null ? null : Guid.Parse(actorUserId), adminUser.Id, nameof(Tenant), tenant.Id.ToString(), "Tenant onboarded.", new { TenantCode = tenant.Code, CompanyCode = company.Code }, cancellationToken: cancellationToken);

        return ServiceResult<OnboardTenantResponse>.Success(new OnboardTenantResponse
        {
            TenantId = tenant.Id,
            CompanyId = company.Id,
            AdminUserId = adminUser.Id,
            TenantCode = tenant.Code,
            AdminUserName = adminUser.UserName ?? string.Empty
        });
    }
}
