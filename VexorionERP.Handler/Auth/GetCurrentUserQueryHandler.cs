using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetCurrentUserQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetCurrentUserQuery, ServiceResult<CurrentUserResponse>>
{
    public async ValueTask<ServiceResult<CurrentUserResponse>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await authApplicationService.GetCurrentUserAsync(user, cancellationToken);
    }
}
