using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InvoiceLineCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInvoiceLineCommandService
{
    public async Task<ServiceResult<InvoiceLineDetailsResponse>> CreateAsync(Guid invoiceId, CreateInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(invoiceId, request.ProductId, request.Quantity, request.UnitPrice, request.TaxAmount);
        if (validation.Count > 0)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.ValidationFailure(validation);
        }

        var invoice = await dbContext.Invoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        var line = request.Adapt<InvoiceLine>();
        line.TenantId = currentTenantProvider.TenantId ?? invoice.TenantId;
        line.InvoiceId = invoiceId;

        dbContext.InvoiceLines.Add(line);
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitPrice);
        invoice.TaxAmount = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.TotalAmount = invoice.Subtotal + invoice.TaxAmount;
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InvoiceLineDetailsResponse>.Success(line.Adapt<InvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<InvoiceLineDetailsResponse>> UpdateAsync(Guid invoiceId, Guid invoiceLineId, UpdateInvoiceLineRequest request, CancellationToken cancellationToken = default)
    {
        var validation = Validate(invoiceId, request.ProductId, request.Quantity, request.UnitPrice, request.TaxAmount);
        if (validation.Count > 0)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.ValidationFailure(validation);
        }

        var invoice = await dbContext.Invoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice not found.");
        }

        var line = invoice.Lines.FirstOrDefault(x => x.Id == invoiceLineId);
        if (line is null)
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice line not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InvoiceLineDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        request.Adapt(line);
        InvoiceCommandService.Recalculate(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InvoiceLineDetailsResponse>.Success(line.Adapt<InvoiceLineDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid invoiceId, Guid invoiceLineId, CancellationToken cancellationToken = default)
    {
        var invoice = await dbContext.Invoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Invoice not found.");
        }

        var line = invoice.Lines.FirstOrDefault(x => x.Id == invoiceLineId);
        if (line is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Invoice line not found.");
        }

        dbContext.InvoiceLines.Remove(line);
        invoice.Subtotal = invoice.Lines.Where(x => x.Id != invoiceLineId && x.IsActive).Sum(x => x.Quantity * x.UnitPrice);
        invoice.TaxAmount = invoice.Lines.Where(x => x.Id != invoiceLineId && x.IsActive).Sum(x => x.TaxAmount);
        invoice.TotalAmount = invoice.Subtotal + invoice.TaxAmount;
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid invoiceId, Guid productId, decimal quantity, decimal unitPrice, decimal taxAmount)
    {
        var errors = new Dictionary<string, string[]>();
        if (invoiceId == Guid.Empty) errors[nameof(CreateInvoiceLineRequest)] = ["Invoice is required."];
        if (productId == Guid.Empty) errors[nameof(CreateInvoiceLineRequest.ProductId)] = ["Product is required."];
        if (quantity <= 0) errors[nameof(CreateInvoiceLineRequest.Quantity)] = ["Quantity must be greater than zero."];
        if (unitPrice < 0) errors[nameof(CreateInvoiceLineRequest.UnitPrice)] = ["Unit price cannot be negative."];
        if (taxAmount < 0) errors[nameof(CreateInvoiceLineRequest.TaxAmount)] = ["Tax amount cannot be negative."];
        return errors;
    }
}
