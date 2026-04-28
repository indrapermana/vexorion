using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class PurchaseInvoiceCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    INumberingService? numberingService = null) : IPurchaseInvoiceCommandService
{
    private readonly INumberingService _numberingService = numberingService ?? new NumberingService(dbContext, currentTenantProvider);

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> CreateAsync(CreatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        PurchaseOrder? sourcePurchaseOrder = null;
        if (request.SourcePurchaseOrderId.HasValue)
        {
            sourcePurchaseOrder = await dbContext.PurchaseOrders
                .Include(x => x.Lines)
                .FirstOrDefaultAsync(
                    x => x.Id == request.SourcePurchaseOrderId.Value && x.TenantId == currentTenantProvider.TenantId.Value,
                    cancellationToken);

            if (sourcePurchaseOrder is null)
                return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Source purchase order not found.");
        }

        var effectiveSupplierId = sourcePurchaseOrder?.SupplierId ?? request.SupplierId;
        var effectiveCurrencyCode = sourcePurchaseOrder?.CurrencyCode ?? request.CurrencyCode;

        var validation = Validate(request.InvoiceNumber, effectiveSupplierId, effectiveCurrencyCode, requireInvoiceNumber: false);
        if (validation.Count > 0)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(validation);

        if (!await dbContext.Suppliers.AnyAsync(x => x.Id == effectiveSupplierId, cancellationToken))
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        DateOnly dueDate = request.DueDate;
        if (request.PaymentTermId.HasValue)
        {
            var term = await dbContext.PaymentTerms.FindAsync([request.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = request.InvoiceDate.AddDays(term.DaysDue);
        }

        var invoiceNumberResult = await ResolveInvoiceNumberAsync(request.InvoiceNumber, request.InvoiceDate, cancellationToken);
        if (!invoiceNumberResult.Succeeded)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(invoiceNumberResult.StatusCode ?? StatusCodes.Status400BadRequest, invoiceNumberResult.ErrorMessage ?? "Failed to generate invoice number.");

        var normalized = invoiceNumberResult.Value!;
        if (await dbContext.PurchaseInvoices.AnyAsync(x => x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A purchase invoice with the same number already exists.");

        var invoice = request.Adapt<PurchaseInvoice>();
        invoice.TenantId = currentTenantProvider.TenantId.Value;
        invoice.InvoiceNumber = normalized;
        invoice.SupplierId = effectiveSupplierId;
        invoice.CurrencyCode = effectiveCurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(request.Notes);
        invoice.VendorReferenceNumber = NormalizeOptional(request.VendorReferenceNumber);
        invoice.Subtotal = 0m;
        invoice.TaxTotal = 0m;
        invoice.GrandTotal = 0m;
        invoice.PaidTotal = 0m;

        if (sourcePurchaseOrder is not null)
        {
            invoice.SourcePurchaseOrderId = sourcePurchaseOrder.Id;
            invoice.Lines = sourcePurchaseOrder.Lines
                .Where(x => x.IsActive)
                .Select(line => new PurchaseInvoiceLine
                {
                    TenantId = currentTenantProvider.TenantId.Value,
                    PurchaseInvoiceId = invoice.Id,
                    ProductId = line.ProductId,
                    Quantity = line.Quantity,
                    UnitCost = line.UnitCost,
                    DiscountAmount = 0m,
                    TaxAmount = 0m,
                })
                .ToList();

            RecalcTotals(invoice);
        }

        dbContext.PurchaseInvoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> UpdateAsync(Guid purchaseInvoiceId, UpdatePurchaseInvoiceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var validation = Validate(request.InvoiceNumber, request.SupplierId, request.CurrencyCode, requireInvoiceNumber: true);
        if (validation.Count > 0)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(validation);

        var invoice = await dbContext.PurchaseInvoices.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "A posted or reversed invoice cannot be modified.");

        if (!await dbContext.Suppliers.AnyAsync(x => x.Id == request.SupplierId, cancellationToken))
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        DateOnly dueDate = request.DueDate;
        if (request.PaymentTermId.HasValue)
        {
            var term = await dbContext.PaymentTerms.FindAsync([request.PaymentTermId.Value], cancellationToken);
            if (term is null)
                return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment term not found.");
            dueDate = request.InvoiceDate.AddDays(term.DaysDue);
        }

        var normalized = request.InvoiceNumber.Trim().ToUpperInvariant();
        if (await dbContext.PurchaseInvoices.AnyAsync(x => x.Id != purchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value && x.InvoiceNumber.ToUpper() == normalized, cancellationToken))
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A purchase invoice with the same number already exists.");

        request.Adapt(invoice);
        invoice.InvoiceNumber = normalized;
        invoice.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        invoice.DueDate = dueDate;
        invoice.Notes = NormalizeOptional(request.Notes);
        invoice.VendorReferenceNumber = NormalizeOptional(request.VendorReferenceNumber);
        RecalcTotals(invoice);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid purchaseInvoiceId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var invoice = await dbContext.PurchaseInvoices.FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status == InvoiceStatus.Cancelled || invoice.PostedAtUtc.HasValue || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Only draft or unposted invoices can be deleted.");

        dbContext.PurchaseInvoices.Remove(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<PurchaseInvoiceDetailsResponse>> ApplyPaymentAsync(Guid purchaseInvoiceId, decimal amount, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (amount <= 0m)
        {
            return ServiceResult<PurchaseInvoiceDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                ["Amount"] = ["Payment amount must be greater than zero."]
            });
        }

        var invoice = await dbContext.PurchaseInvoices.FirstOrDefaultAsync(x => x.Id == purchaseInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Purchase invoice not found.");

        if (invoice.Status == InvoiceStatus.Draft || invoice.Status == InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = invoice.PaidTotal + amount;
        if (nextPaidTotal > invoice.GrandTotal)
            return ServiceResult<PurchaseInvoiceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        invoice.PaidTotal = nextPaidTotal;
        invoice.Status = nextPaidTotal == invoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<PurchaseInvoiceDetailsResponse>.Success(invoice.Adapt<PurchaseInvoiceDetailsResponse>());
    }

    internal static void RecalcTotals(PurchaseInvoice invoice)
    {
        invoice.Subtotal = invoice.Lines.Where(x => x.IsActive).Sum(x => (x.Quantity * x.UnitCost) - x.DiscountAmount);
        invoice.TaxTotal = invoice.Lines.Where(x => x.IsActive).Sum(x => x.TaxAmount);
        invoice.GrandTotal = invoice.Subtotal + invoice.TaxTotal;
    }

    private async Task<ServiceResult<string>> ResolveInvoiceNumberAsync(string invoiceNumber, DateOnly invoiceDate, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(invoiceNumber) && !string.Equals(invoiceNumber.Trim(), "AUTO", StringComparison.OrdinalIgnoreCase))
            return ServiceResult<string>.Success(invoiceNumber.Trim().ToUpperInvariant());

        var nextNumber = await _numberingService.GenerateNextAsync("PURCHASE_INVOICE", invoiceDate, cancellationToken);
        if (!nextNumber.Succeeded)
            return ServiceResult<string>.Failure(nextNumber.StatusCode ?? StatusCodes.Status400BadRequest, nextNumber.ErrorMessage ?? "Failed to generate invoice number.");

        return ServiceResult<string>.Success(nextNumber.Value!);
    }

    private static Dictionary<string, string[]> Validate(string invoiceNumber, Guid supplierId, string currencyCode, bool requireInvoiceNumber)
    {
        var errors = new Dictionary<string, string[]>();
        if (requireInvoiceNumber && string.IsNullOrWhiteSpace(invoiceNumber)) errors[nameof(CreatePurchaseInvoiceRequest.InvoiceNumber)] = ["Invoice number is required."];
        if (supplierId == Guid.Empty) errors[nameof(CreatePurchaseInvoiceRequest.SupplierId)] = ["Supplier is required."];
        if (string.IsNullOrWhiteSpace(currencyCode)) errors[nameof(CreatePurchaseInvoiceRequest.CurrencyCode)] = ["Currency code is required."];
        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
