using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts.Tenancy;
using VexorionERP.Database;
using VexorionERP.Models.Identity;
using VexorionERP.Models.Organization;
using VexorionERP.Models.Tenancy;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class TenantOnboardingService(
    AppDbContext dbContext,
    UserManager<User> userManager,
    IAuditLogger auditLogger) : ITenantOnboardingService
{
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

        var createResult = await userManager.CreateAsync(adminUser, request.AdminPassword);
        if (!createResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ServiceResult<OnboardTenantResponse>.ValidationFailure(createResult.Errors.GroupBy(x => x.Code).ToDictionary(group => group.Key, group => group.Select(x => x.Description).ToArray()));
        }

        await userManager.AddToRolesAsync(adminUser, [AppRoles.SystemAdmin, AppRoles.TenantAdmin]);
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