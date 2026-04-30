using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetPermissionsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetPermissionsQuery, ServiceResult<PermissionListResponse>>
{
    public ValueTask<ServiceResult<PermissionListResponse>> Handle(GetPermissionsQuery request, CancellationToken cancellationToken)
    {
        var authApplicationService = serviceProvider.GetRequiredService<IAuthApplicationService>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var user = httpContextAccessor.HttpContext!.User;
        return ValueTask.FromResult(authApplicationService.GetPermissions(user));
    }
}
