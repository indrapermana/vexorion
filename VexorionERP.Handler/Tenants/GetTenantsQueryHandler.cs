using Mapster;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantsQuery, ServiceResult<IReadOnlyCollection<TenantListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<TenantListItemResponse>>> Handle(
        GetTenantsQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenants = await dbContext.Tenants
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

        var result = tenants.Select(t => t.Adapt<TenantListItemResponse>()).ToList();
        return ServiceResult<IReadOnlyCollection<TenantListItemResponse>>.Success(result);
    }
}
