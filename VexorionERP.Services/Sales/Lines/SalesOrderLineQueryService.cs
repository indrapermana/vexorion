using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesOrderLineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesOrderLineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAllAsync(Guid salesOrderId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var lines = await dbContext.SalesOrderLines.AsNoTracking().Where(x => x.SalesOrderId == salesOrderId).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>.Success(lines.Adapt<IReadOnlyCollection<SalesOrderLineListItemResponse>>());
    }

    public async Task<ServiceResult<SalesOrderLineDetailsResponse>> GetByIdAsync(Guid salesOrderId, Guid salesOrderLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var line = await dbContext.SalesOrderLines.AsNoTracking().FirstOrDefaultAsync(x => x.SalesOrderId == salesOrderId && x.Id == salesOrderLineId, cancellationToken);
        return line is null
            ? ServiceResult<SalesOrderLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales order line not found.")
            : ServiceResult<SalesOrderLineDetailsResponse>.Success(line.Adapt<SalesOrderLineDetailsResponse>());
    }
}
