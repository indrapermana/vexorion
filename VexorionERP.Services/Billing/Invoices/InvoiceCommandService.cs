using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Billing.Invoices;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Billing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InvoiceCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInvoiceCommandService
{
    public async Task<ServiceResult<InvoiceDetailsResponse>> CreateAsync(CreateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.InvoiceNumber, request.CustomerId, request.CurrencyCode, request.AmountPaid);
        if (validation.Count > 0)
        {
            return ServiceResult<InvoiceDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        var normalizedNumber = request.InvoiceNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.Invoices.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An invoice with the same number already exists.");
        }

        var invoice = request.Adapt<Invoice>();
        invoice.TenantId = currentTenantProvider.TenantId.Value;
        invoice.InvoiceNumber = request.InvoiceNumber.Trim().ToUpperInvariant();
        invoice.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        invoice.Subtotal = 0m;
        invoice.TaxAmount = 0m;
        invoice.TotalAmount = 0m;

        dbContext.Invoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InvoiceDetailsResponse>.Success(invoice.Adapt<InvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<InvoiceDetailsResponse>> UpdateAsync(Guid invoiceId, UpdateInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.InvoiceNumber, request.CustomerId, request.CurrencyCode, request.AmountPaid);
        if (validation.Count > 0)
        {
            return ServiceResult<InvoiceDetailsResponse>.ValidationFailure(validation);
        }

        var invoice = await dbContext.Invoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Invoice not found.");
        }

        if (!await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");
        }

        var normalizedNumber = request.InvoiceNumber.Trim().ToUpperInvariant();
        var exists = await dbContext.Invoices.AnyAsync(x => x.Id != invoiceId && x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalizedNumber, cancellationToken);
        if (exists)
        {
            return ServiceResult<InvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An invoice with the same number already exists.");
        }

        request.Adapt(invoice);
        invoice.InvoiceNumber = request.InvoiceNumber.Trim().ToUpperInvariant();
        invoice.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        Recalculate(invoice);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InvoiceDetailsResponse>.Success(invoice.Adapt<InvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        var invoice = await dbContext.Invoices.FirstOrDefaultAsync(x => x.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Invoice not found.");
        }

        dbContext.Invoices.Remove(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    internal static void Recalculate(Invoice invoice)
    {
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.Quantity * x.UnitPrice);
        invoice.TaxAmount = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.TotalAmount = invoice.Subtotal + invoice.TaxAmount;
    }

    private static Dictionary<string, string[]> Validate(string invoiceNumber, Guid customerId, string currencyCode, decimal amountPaid)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(invoiceNumber)) errors[nameof(CreateInvoiceRequest.InvoiceNumber)] = ["Invoice number is required."];
        if (customerId == Guid.Empty) errors[nameof(CreateInvoiceRequest.CustomerId)] = ["Customer is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreateInvoiceRequest.CurrencyCode)] = ["Currency code is required."];
        if (amountPaid < 0) errors[nameof(CreateInvoiceRequest.AmountPaid)] = ["Amount paid cannot be negative."];
        return errors;
    }
}