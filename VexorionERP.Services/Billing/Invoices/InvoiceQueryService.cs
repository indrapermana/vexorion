using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInvoiceQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoices = await dbContext.Invoices.AsNoTracking().OrderByDescending(x => x.InvoiceDate).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<InvoiceListItemResponse>>.Success(invoices.Adapt<IReadOnlyCollection<InvoiceListItemResponse>>());
    }

    public async Task<ServiceResult<InvoiceDetailsResponse>> GetByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var invoice = await dbContext.Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        return invoice is null
            ? ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice not found.")
            : ServiceResult<InvoiceDetailsResponse>.Success(invoice.Adapt<InvoiceDetailsResponse>());
    }
}
