using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantModuleEffectiveAccessBatchQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantModuleEffectiveAccessBatchQuery, ServiceResult<TenantModuleEffectiveAccessBatchResponse>>
{
    public async ValueTask<ServiceResult<TenantModuleEffectiveAccessBatchResponse>> Handle(
        GetTenantModuleEffectiveAccessBatchQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var rolloutOptions = serviceProvider.GetRequiredService<IOptions<TenantModuleRolloutOptions>>().Value;
        var tenants = await dbContext.Tenants.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        var configs = await dbContext.TenantModuleConfigs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ToDictionaryAsync(x => x.TenantId, cancellationToken);

        var items = tenants
            .Select(tenant => TenantModuleEffectiveAccessBuilder.Build(
                tenant,
                configs.GetValueOrDefault(tenant.Id),
                rolloutOptions))
            .ToList();

        return ServiceResult<TenantModuleEffectiveAccessBatchResponse>.Success(new TenantModuleEffectiveAccessBatchResponse
        {
            Items = items,
            FailedTenantIds = []
        });
    }
}
