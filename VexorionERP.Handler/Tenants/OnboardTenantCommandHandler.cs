using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class OnboardTenantCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<OnboardTenantCommand, ServiceResult<OnboardTenantResponse>>
{
    public async ValueTask<ServiceResult<OnboardTenantResponse>> Handle(OnboardTenantCommand request, CancellationToken cancellationToken)
    {
        var tenantOnboardingService = serviceProvider.GetRequiredService<ITenantOnboardingService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await tenantOnboardingService.OnboardAsync(request.Request, user, cancellationToken);
    }
}
