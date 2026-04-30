using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetRolePermissionsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetRolePermissionsQuery, ServiceResult<IReadOnlyCollection<RolePermissionsResponse>>>
{
    public ValueTask<ServiceResult<IReadOnlyCollection<RolePermissionsResponse>>> Handle(GetRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        var roleManagementService = serviceProvider.GetRequiredService<IRoleManagementService>();
        return ValueTask.FromResult(roleManagementService.GetRolePermissions());
    }
}
