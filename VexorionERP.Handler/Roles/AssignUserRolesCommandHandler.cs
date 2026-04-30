using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class AssignUserRolesCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<AssignUserRolesCommand, ServiceResult<bool>>
{
    public async ValueTask<ServiceResult<bool>> Handle(AssignUserRolesCommand request, CancellationToken cancellationToken)
    {
        var roleManagementService = serviceProvider.GetRequiredService<IRoleManagementService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return await roleManagementService.AssignUserRolesAsync(request.UserId, request.Request, user, cancellationToken);
    }
}
