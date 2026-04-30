using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class LogoutRefreshCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<LogoutRefreshCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(LogoutRefreshCommand request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await authApplicationService.LogoutRefreshAsync(user, request.Request, cancellationToken);
    }
}
