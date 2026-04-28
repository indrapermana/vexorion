using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesInvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesInvoiceQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>> GetAllAsync(bool outstandingOnly = false, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var query = dbContext.SalesInvoices.AsNoTracking()
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value);

        if (outstandingOnly)
        {
            query = query.Where(x => x.GrandTotal > x.PaidTotal);
        }

        var invoices = await query
            .OrderByDescending(x => x.InvoiceDate)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<SalesInvoiceListItemResponse>>.Success(invoices.Adapt<IReadOnlyCollection<SalesInvoiceListItemResponse>>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> GetByIdAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        return invoice is null
            ? ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.")
            : ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }
}
