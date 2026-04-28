using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseOrderLineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseOrderLineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>> GetAllAsync(Guid purchaseOrderId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var lines = await dbContext.PurchaseOrderLines.AsNoTracking().Where(x => x.PurchaseOrderId == purchaseOrderId).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>.Success(lines.Adapt<IReadOnlyCollection<PurchaseOrderLineListItemResponse>>());
    }

    public async Task<ServiceResult<PurchaseOrderLineDetailsResponse>> GetByIdAsync(Guid purchaseOrderId, Guid purchaseOrderLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var line = await dbContext.PurchaseOrderLines.AsNoTracking().FirstOrDefaultAsync(x => x.PurchaseOrderId == purchaseOrderId && x.Id == purchaseOrderLineId, cancellationToken);
        return line is null
            ? ServiceResult<PurchaseOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase order line not found.")
            : ServiceResult<PurchaseOrderLineDetailsResponse>.Success(line.Adapt<PurchaseOrderLineDetailsResponse>());
    }
}
