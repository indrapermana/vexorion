using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UnlockUserCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UnlockUserCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(UnlockUserCommand request, CancellationToken cancellationToken)
    {
        var userManagementService = serviceProvider.GetRequiredService<IUserManagementService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await userManagementService.UnlockAsync(request.UserId, user, cancellationToken);
    }
}
