using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesOrderQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<SalesOrder>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrder>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrder>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var orders = await context.SalesOrders.GetByTenant(tenantId.Value).AsNoTracking().OrderByDescending(x => x.OrderDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<SalesOrder>>>.Success(AdaptEntityListResponses(orders));
    }

    public async Task<ServiceResult<IEntityResponse<SalesOrder>>> GetByIdAsync(Guid salesOrderId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var order = await context.SalesOrders.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == salesOrderId, cancellationToken);
        return order is null
            ? ServiceResult<IEntityResponse<SalesOrder>>.Failure(StatusCodes.Status404NotFound, "Sales order not found.")
            : ServiceResult<IEntityResponse<SalesOrder>>.Success(order.Adapt<SalesOrderDetailsResponse>());
    }
}
