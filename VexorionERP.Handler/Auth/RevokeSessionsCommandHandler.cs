using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class RevokeSessionsCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<RevokeSessionsCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(RevokeSessionsCommand request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await authApplicationService.RevokeSessionsAsync(user, cancellationToken);
    }
}
