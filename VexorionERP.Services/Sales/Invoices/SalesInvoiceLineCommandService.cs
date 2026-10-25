using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SalesInvoiceLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseLineCommandService<SalesInvoice, SalesInvoiceLine, CreateSalesInvoiceLineRequest, UpdateSalesInvoiceLineRequest>
{
    protected override async Task<ServiceResult<ILineResponse<SalesInvoiceLine>>> CreateAsync(Guid salesInvoiceId, CreateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status409Conflict, "Lines can only be added to draft invoices.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        var line = request.Adapt<SalesInvoiceLine>();
        line.TenantId = currentTenantProvider.TenantId.Value;
        line.SalesInvoiceId = salesInvoiceId;

        dbContext.SalesInvoiceLines.Add(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<ILineResponse<SalesInvoiceLine>>.Success(line.Adapt<SalesInvoiceLineDetailsResponse>());
    }

    protected override async Task<ServiceResult<ILineResponse<SalesInvoiceLine>>> UpdateAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, UpdateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status409Conflict, "Lines can only be modified on draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == salesInvoiceLineId);
        if (line is null)
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status404NotFound, "Sales invoice line not found.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<ILineResponse<SalesInvoiceLine>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        request.Adapt(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<ILineResponse<SalesInvoiceLine>>.Success(line.Adapt<SalesInvoiceLineDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<bool>.Failure(StatusCodes.Status409Conflict, "Lines can only be deleted from draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == salesInvoiceLineId);
        if (line is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice line not found.");

        invoice.Lines.Remove(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }
}
