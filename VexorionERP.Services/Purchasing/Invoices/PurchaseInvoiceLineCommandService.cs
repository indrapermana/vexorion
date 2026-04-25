using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class PurchaseInvoiceLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IPurchaseInvoiceLineCommandService
{
    public async Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> CreateAsync(Guid purchaseInvoiceId, CreatePurchaseInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.PurchaseInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Lines can only be added to draft invoices.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        var line = request.Adapt<PurchaseInvoiceLine>();
        line.TenantId = currentTenantProvider.TenantId.Value;
        line.PurchaseInvoiceId = purchaseInvoiceId;

        dbContext.PurchaseInvoiceLines.Add(line);
        PurchaseInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Success(line.Adapt<PurchaseInvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseInvoiceLineDetailsResponse>> UpdateAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, UpdatePurchaseInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.PurchaseInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Lines can only be modified on draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == purchaseInvoiceLineId);
        if (line is null)
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice line not found.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        request.Adapt(line);
        PurchaseInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<PurchaseInvoiceLineDetailsResponse>.Success(line.Adapt<PurchaseInvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, Guid purchaseInvoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.PurchaseInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Lines can only be deleted from draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == purchaseInvoiceLineId);
        if (line is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase invoice line not found.");

        invoice.Lines.Remove(line);
        PurchaseInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }
}
