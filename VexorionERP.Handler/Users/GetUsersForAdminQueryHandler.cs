using Mediator;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetUsersForAdminQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetUsersForAdminQuery, ServiceResult<IReadOnlyCollection<UserListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<UserListItemResponse>>> Handle(GetUsersForAdminQuery request, CancellationToken cancellationToken)
    {
        var userManager = serviceProvider.GetRequiredService<UserManager<User>>();

        var query = userManager.Users
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (request.TenantId.HasValue)
        {
            query = query.Where(x => x.TenantId == request.TenantId.Value);
        }

        var users = await query
            .OrderBy(x => x.UserName)
            .ToListAsync(cancellationToken);

        var response = new List<UserListItemResponse>(users.Count);

        foreach (var user in users)
        {
            var roles = await userManager.GetRolesAsync(user);
            response.Add(new UserListItemResponse
            {
                Id = user.Id,
                TenantId = user.TenantId,
                UserName = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                FirstName = user.FirstName,
                LastName = user.LastName,
                IsActive = user.IsActive,
                Roles = roles.ToArray(),
            });
        }

        return ServiceResult<IReadOnlyCollection<UserListItemResponse>>.Success(response);
    }
}
