using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Purchasing.Payments;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Purchasing;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class VendorPaymentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IVendorPaymentCommandService
{
    public async Task<ServiceResult<VendorPaymentDetailsResponse>> CreateAsync(CreateVendorPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var validation = Validate(request);
        if (validation.Count > 0)
            return ServiceResult<VendorPaymentDetailsResponse>.ValidationFailure(validation);

        var supplier = await dbContext.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.SupplierId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (supplier is null)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        var purchaseInvoice = await dbContext.PurchaseInvoices
            .FirstOrDefaultAsync(x => x.Id == request.PurchaseInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (purchaseInvoice is null)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Purchase invoice not found.");

        if (purchaseInvoice.SupplierId != request.SupplierId)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Purchase invoice does not belong to the specified supplier.");

        var currencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        if (!string.Equals(purchaseInvoice.CurrencyCode, currencyCode, StringComparison.OrdinalIgnoreCase))
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment currency must match invoice currency.");

        if (purchaseInvoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || purchaseInvoice.ReversedAtUtc.HasValue)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = purchaseInvoice.PaidTotal + request.Amount;
        if (nextPaidTotal > purchaseInvoice.GrandTotal)
            return ServiceResult<VendorPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        var payment = new VendorPayment
        {
            TenantId = currentTenantProvider.TenantId.Value,
            SupplierId = request.SupplierId,
            PurchaseInvoiceId = request.PurchaseInvoiceId,
            PaymentDate = request.PaymentDate,
            Amount = request.Amount,
            CurrencyCode = currencyCode,
            ReferenceNumber = NormalizeOptional(request.ReferenceNumber),
            PaymentMethod = NormalizeOptional(request.PaymentMethod),
            Notes = NormalizeOptional(request.Notes),
        };

        purchaseInvoice.PaidTotal = nextPaidTotal;
        purchaseInvoice.Status = nextPaidTotal == purchaseInvoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        dbContext.VendorPayments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<VendorPaymentDetailsResponse>.Success(payment.Adapt<VendorPaymentDetailsResponse>());
    }

    private static Dictionary<string, string[]> Validate(CreateVendorPaymentRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.SupplierId == Guid.Empty)
            errors[nameof(CreateVendorPaymentRequest.SupplierId)] = ["Supplier is required."];
        if (request.PurchaseInvoiceId == Guid.Empty)
            errors[nameof(CreateVendorPaymentRequest.PurchaseInvoiceId)] = ["Purchase invoice is required."];
        if (request.Amount <= 0m)
            errors[nameof(CreateVendorPaymentRequest.Amount)] = ["Amount must be greater than zero."];
        if (string.IsNullOrWhiteSpace(request.CurrencyCode))
            errors[nameof(CreateVendorPaymentRequest.CurrencyCode)] = ["Currency code is required."];

        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}