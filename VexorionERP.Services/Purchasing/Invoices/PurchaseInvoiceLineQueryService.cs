using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseInvoiceLineQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseInvoiceLineQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>> GetAllAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoiceExists = await dbContext.PurchaseInvoices.AnyAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (!invoiceExists)
            return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        var lines = await dbContext.PurchaseInvoiceLines.AsNoTracking()
            .Where(x => x.PurchaseInvoiceId == purchaseInvoiceId)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>.Success(lines.Adapt<IReadOnlyCollection<PurchaseInvoiceLineListItemResponse>>());
    }

    public async Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> GetByIdAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoiceExists = await dbContext.PurchaseInvoices.AnyAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (!invoiceExists)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        var line = await dbContext.PurchaseInvoiceLines.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == purchaseInvoiceLineId && x.PurchaseInvoiceId == purchaseInvoiceId, cancellationToken);

        return line is null
            ? ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice line not found.")
            : ServiceResult<PurchaseInvoiceLineDetailsResponse>.Success(line.Adapt<PurchaseInvoiceLineDetailsResponse>());
    }
}
