using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SalesInvoiceLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISalesInvoiceLineCommandService
{
    public async Task<ServiceResult<SalesInvoiceLineDetailsResponse>> CreateAsync(Guid salesInvoiceId, CreateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Lines can only be added to draft invoices.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        var line = request.Adapt<SalesInvoiceLine>();
        line.TenantId = currentTenantProvider.TenantId.Value;
        line.SalesInvoiceId = salesInvoiceId;

        dbContext.SalesInvoiceLines.Add(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<SalesInvoiceLineDetailsResponse>.Success(line.Adapt<SalesInvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<SalesInvoiceLineDetailsResponse>> UpdateAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, UpdateSalesInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Lines can only be modified on draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == salesInvoiceLineId);
        if (line is null)
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice line not found.");

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
            return ServiceResult<SalesInvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");

        request.Adapt(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<SalesInvoiceLineDetailsResponse>.Success(line.Adapt<SalesInvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, Guid salesInvoiceLineId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status != InvoiceStatus.Draft)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Lines can only be deleted from draft invoices.");

        var line = invoice.Lines.FirstOrDefault(x => x.Id == salesInvoiceLineId);
        if (line is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice line not found.");

        invoice.Lines.Remove(line);
        SalesInvoiceCommandService.RecalcTotals(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }
}
