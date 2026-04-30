using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ResetUserPasswordCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ResetUserPasswordCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(ResetUserPasswordCommand request, CancellationToken cancellationToken)
    {
        var userManagementService = serviceProvider.GetRequiredService<IUserManagementService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await userManagementService.ResetPasswordAsync(request.UserId, request.Request, user, cancellationToken);
    }
}
