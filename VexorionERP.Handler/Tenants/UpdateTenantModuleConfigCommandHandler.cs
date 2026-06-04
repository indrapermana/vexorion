using Mapster;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateTenantModuleConfigCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UpdateTenantModuleConfigCommand, ServiceResult<TenantModuleConfigResponse>>
{
    public async ValueTask<ServiceResult<TenantModuleConfigResponse>> Handle(
        UpdateTenantModuleConfigCommand request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var config = await dbContext.TenantModuleConfigs
            .Where(c => c.TenantId == request.TenantId)
            .FirstOrDefaultAsync(cancellationToken);

        if (config is null)
        {
            config = new TenantModuleConfig
            {
                Id = Guid.NewGuid(),
                TenantId = request.TenantId
            };
            dbContext.TenantModuleConfigs.Add(config);
        }

        config.ProjectManagementEnabled = request.Request.ProjectManagementEnabled;
        config.DocumentManagementEnabled = request.Request.DocumentManagementEnabled;
        config.EmployeeManagementEnabled = request.Request.EmployeeManagementEnabled;
        config.SalesEnabled = request.Request.SalesEnabled;
        config.PurchasingEnabled = request.Request.PurchasingEnabled;
        config.InventoryEnabled = request.Request.InventoryEnabled;
        config.UpdatedByUserId = request.UpdatedByUserId;
        config.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<TenantModuleConfigResponse>.Success(config.Adapt<TenantModuleConfigResponse>());
    }
}
