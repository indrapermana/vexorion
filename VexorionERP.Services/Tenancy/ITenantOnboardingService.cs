using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ITenantOnboardingService
{
    Task<ServiceResult<OnboardTenantResponse>> OnboardAsync(OnboardTenantRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken = default);
}
