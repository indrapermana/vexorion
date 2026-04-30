using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseOrderQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<PurchaseOrder>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrder>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrder>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var orders = await context.PurchaseOrders.GetByTenant(tenantId.Value).AsNoTracking().OrderByDescending(x => x.OrderDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<PurchaseOrder>>>.Success(AdaptEntityListResponses(orders));
    }

    public async Task<ServiceResult<IEntityResponse<PurchaseOrder>>> GetByIdAsync(Guid purchaseOrderId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await context.PurchaseOrders.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        return order is null
            ? ServiceResult<IEntityResponse<PurchaseOrder>>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.")
            : ServiceResult<IEntityResponse<PurchaseOrder>>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }
}
