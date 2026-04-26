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

public class SalesInvoiceCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    INumberingService? numberingService = null) : ISalesInvoiceCommandService
{
    private readonly INumberingService _numberingService = numberingService ?? new NumberingService(dbContext, currentTenantProvider);

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> CreateAsync(CreateSalesInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        SalesOrder? sourceSalesOrder = null;
        if (request.SourceSalesOrderId.HasValue)
        {
            sourceSalesOrder = await dbContext.SalesOrders
                .Include(x => x.Lines)
                .FirstOrDefaultAsync(
                    x => x.Id == request.SourceSalesOrderId.Value && x.TenantId == currentTenantProvider.TenantId.Value,
                    cancellationToken);

            if (sourceSalesOrder is null)
                return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Source sales order not found.");
        }

        var effectiveCustomerId = sourceSalesOrder?.CustomerId ?? request.CustomerId;
        var effectiveCurrencyCode = sourceSalesOrder?.CurrencyCode ?? request.CurrencyCode;

        var validation = Validate(request.InvoiceNumber, effectiveCustomerId, effectiveCurrencyCode, requireInvoiceNumber: false);
        if (validation.Count > 0)
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(validation);

        if (!await dbContext.Customers.AnyAsync(x => x.Id == effectiveCustomerId, cancellationToken))
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        DateOnly dueDate = request.DueDate;
        if (request.PaymentTermId.HasValue)
        {
            var term = await dbContext.PaymentTerms.FindAsync([request.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = request.InvoiceDate.AddDays(term.DaysDue);
        }

        var invoiceNumberResult = await ResolveInvoiceNumberAsync(request.InvoiceNumber, request.InvoiceDate, cancellationToken);
        if (!invoiceNumberResult.Succeeded)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(invoiceNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, invoiceNumberResult.ErrorMessage ?? "Failed to generate invoice number.");

        var normalized = invoiceNumberResult.Value!;
        if (await dbContext.SalesInvoices.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A sales invoice with the same number already exists.");

        var invoice = request.Adapt<SalesInvoice>();
        invoice.TenantId = currentTenantProvider.TenantId.Value;
        invoice.InvoiceNumber = normalized;
        invoice.CustomerId = effectiveCustomerId;
        invoice.CurrencyCode = effectiveCurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(request.Notes);
        invoice.Subtotal = 0m;
        invoice.TaxTotal = 0m;
        invoice.GrandTotal = 0m;
        invoice.PaidTotal = 0m;

        if (sourceSalesOrder is not null)
        {
            invoice.SourceSalesOrderId = sourceSalesOrder.Id;
            invoice.Lines = sourceSalesOrder.Lines
                .Where(x => x.IsActive)
                .Select(line => new SalesInvoiceLine
                {
                    TenantId = currentTenantProvider.TenantId.Value,
                    SalesInvoiceId = invoice.Id,
                    ProductId = line.ProductId,
                    Quantity = line.Quantity,
                    UnitPrice = line.UnitPrice,
                    DiscountAmount = line.DiscountAmount,
                    TaxAmount = 0m,
                })
                .ToList();

            RecalcTotals(invoice);
        }

        dbContext.SalesInvoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> UpdateAsync(Guid salesInvoiceId, UpdateSalesInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var validation = Validate(request.InvoiceNumber, request.CustomerId, request.CurrencyCode, requireInvoiceNumber: true);
        if (validation.Count > 0)
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(validation);

        var invoice = await dbContext.SalesInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "A posted or reversed invoice cannot be modified.");

        if (!await dbContext.Customers.AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        DateOnly dueDate = request.DueDate;
        if (request.PaymentTermId.HasValue)
        {
            var term = await dbContext.PaymentTerms.FindAsync([request.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = request.InvoiceDate.AddDays(term.DaysDue);
        }

        var normalized = request.InvoiceNumber.Trim().ToUpperInvariant();
        if (await dbContext.SalesInvoices.AnyAsync(x => x.Id != salesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A sales invoice with the same number already exists.");

        request.Adapt(invoice);
        invoice.InvoiceNumber = normalized;
        invoice.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(request.Notes);
        RecalcTotals(invoice);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.SalesInvoices.FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status == InvoiceStatus.Cancelled || invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft or unposted invoices can be deleted.");

        dbContext.SalesInvoices.Remove(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<SalesInvoiceDetailsResponse>> ApplyPaymentAsync(Guid salesInvoiceId, decimal amount, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (amount <= 0m)
        {
            return ServiceResult<SalesInvoiceDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                ["Amount"] = ["Payment amount must be greater than zero."]
            });
        }

        var invoice = await dbContext.SalesInvoices.FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.");

        if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = invoice.PaidTotal + amount;
        if (nextPaidTotal > invoice.GrandTotal)
            return ServiceResult<SalesInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        invoice.PaidTotal = nextPaidTotal;
        invoice.Status = nextPaidTotal == invoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<SalesInvoiceDetailsResponse>.Success(invoice.Adapt<SalesInvoiceDetailsResponse>());
    }

    internal static void RecalcTotals(SalesInvoice invoice)
    {
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        invoice.TaxTotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.GrandTotal = invoice.Subtotal + invoice.TaxTotal;
    }

    private async Task<ServiceResult<string>> ResolveInvoiceNumberAsync(string invoiceNumber, DateOnly invoiceDate, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(invoiceNumber) && !string.Equals(invoiceNumber.Trim(), "AUTO", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<string>.Success(invoiceNumber.Trim().ToUpperInvariant());

        var nextNumber = await _numberingService.GenerateNextAsync("SALES_INVOICE", invoiceDate, cancellationToken);
        if (!nextNumber.Succeeded)
            return ServiceResult<string>.Failure(nextNumber.StatusCode ?? StatusCodes.Status400BadRequest, nextNumber.ErrorMessage ?? "Failed to generate invoice number.");

        return ServiceResult<string>.Success(nextNumber.Value!);
    }

    private static Dictionary<string, string[]> Validate(string invoiceNumber, Guid customerId, string currencyCode, bool requireInvoiceNumber)
    {
        var errors = new Dictionary<string, string[]>();
        if (requireInvoiceNumber && string.IsNullOrWhiteSpace(invoiceNumber)) errors[nameof(CreateSalesInvoiceRequest.InvoiceNumber)] = ["Invoice number is required."];
        if (customerId == Guid.Empty) errors[nameof(CreateSalesInvoiceRequest.CustomerId)] = ["Customer is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreateSalesInvoiceRequest.CurrencyCode)] = ["Currency code is required."];
        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
