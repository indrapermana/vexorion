using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetUsersQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetUsersQuery, ServiceResult<IReadOnlyCollection<UserListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<UserListItemResponse>>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var userManagementService = serviceProvider.GetRequiredService<IUserManagementService>();
        return await userManagementService.GetAllAsync(cancellationToken);
    }
}
