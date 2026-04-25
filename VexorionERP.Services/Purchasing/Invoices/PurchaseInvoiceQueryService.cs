using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseInvoiceQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseInvoiceQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoices = await dbContext.PurchaseInvoices.AsNoTracking()
            .Where(x => x.TenantId == currentTenantProvider.TenantId.Value)
            .OrderByDescending(x => x.InvoiceDate)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>.Success(invoices.Adapt<IReadOnlyCollection<PurchaseInvoiceListItemResponse>>());
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.PurchaseInvoices.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);

        return invoice is null
            ? ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.")
            : ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }
}
