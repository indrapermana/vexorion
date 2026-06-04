using Mapster;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantModuleConfigQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantModuleConfigQuery, ServiceResult<TenantModuleConfigResponse>>
{
    public async ValueTask<ServiceResult<TenantModuleConfigResponse>> Handle(
        GetTenantModuleConfigQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var config = await dbContext.TenantModuleConfigs
            .AsNoTracking()
            .Where(c => c.TenantId == request.TenantId)
            .FirstOrDefaultAsync(cancellationToken);

        // Return defaults if no config exists yet
        if (config is null)
        {
            return ServiceResult<TenantModuleConfigResponse>.Success(new TenantModuleConfigResponse
            {
                TenantId = request.TenantId,
                SalesEnabled = true,
                PurchasingEnabled = true,
                InventoryEnabled = true
            });
        }

        return ServiceResult<TenantModuleConfigResponse>.Success(config.Adapt<TenantModuleConfigResponse>());
    }
}
