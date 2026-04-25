using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Orders;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesOrderQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesOrderQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var orders = await dbContext.SalesOrders.AsNoTracking().OrderByDescending(x => x.OrderDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>.Success(orders.Adapt<IReadOnlyCollection<SalesOrderListItemResponse>>());
    }

    public async Task<ServiceResult<SalesOrderDetailsResponse>> GetByIdAsync(Guid salesOrderId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await dbContext.SalesOrders.AsNoTracking().FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        return order is null
            ? ServiceResult<SalesOrderDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order not found.")
            : ServiceResult<SalesOrderDetailsResponse>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }
}