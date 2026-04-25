using System.Security.Claims;
using VexorionERP.Contracts.Tenancy;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ITenantOnboardingService
{
    Task<ServiceResult<OnboardTenantResponse>> OnboardAsync(OnboardTenantRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}