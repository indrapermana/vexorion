using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Orders;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseOrderQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseOrderQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var orders = await dbContext.PurchaseOrders.AsNoTracking().OrderByDescending(x => x.OrderDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<PurchaseOrderListItemResponse>>.Success(orders.Adapt<IReadOnlyCollection<PurchaseOrderListItemResponse>>());
    }

    public async Task<ServiceResult<PurchaseOrderDetailsResponse>> GetByIdAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await dbContext.PurchaseOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == purchaseOrderId, cancellationToken);
        return order is null
            ? ServiceResult<PurchaseOrderDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order not found.")
            : ServiceResult<PurchaseOrderDetailsResponse>.Success(order.Adapt<PurchaseOrderDetailsResponse>());
    }
}