using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class SetUserStatusCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<SetUserStatusCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(SetUserStatusCommand request, CancellationToken cancellationToken)
    {
        var userManagementService = serviceProvider.GetRequiredService<IUserManagementService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await userManagementService.SetStatusAsync(request.UserId, request.Request, user, cancellationToken);
    }
}
