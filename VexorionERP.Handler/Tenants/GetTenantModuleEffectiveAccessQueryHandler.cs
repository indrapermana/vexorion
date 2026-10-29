using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantModuleEffectiveAccessQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantModuleEffectiveAccessQuery, ServiceResult<TenantModuleEffectiveAccessResponse>>
{
    public async ValueTask<ServiceResult<TenantModuleEffectiveAccessResponse>> Handle(
        GetTenantModuleEffectiveAccessQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var rolloutOptions = serviceProvider.GetRequiredService<IOptions<TenantModuleRolloutOptions>>().Value;

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.TenantId, cancellationToken);

        if (tenant is null)
        {
            return ServiceResult<TenantModuleEffectiveAccessResponse>.Failure(404, "Tenant not found.");
        }

        var config = await dbContext.TenantModuleConfigs
            .IgnoreQueryFilters()
            .GetByTenant(request.TenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(cancellationToken);

        var response = TenantModuleEffectiveAccessBuilder.Build(tenant, config, rolloutOptions);

        return ServiceResult<TenantModuleEffectiveAccessResponse>.Success(response);
    }

}
