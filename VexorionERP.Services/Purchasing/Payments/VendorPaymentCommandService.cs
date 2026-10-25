using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class VendorPaymentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<VendorPayment>(currentTenantProvider)
{
    // Compatibility wrapper used by tests and existing code
    public async Task<ServiceResult<VendorPaymentDetailsResponse>> CreateAsync(CreateVendorPaymentRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<VendorPayment>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public override async Task<ServiceResult<IEntityResponse<VendorPayment>>> CreateAsync(ICreateInput<VendorPayment> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var createRequest = (CreateVendorPaymentRequest)request;

        var validation = Validate(createRequest);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<VendorPayment>>.ValidationFailure(validation);

        var supplier = await context.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == createRequest.SupplierId && x.TenantId == tenantId.Value, cancellationToken);
        if (supplier is null)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Supplier not found.");

        var purchaseInvoice = await context.PurchaseInvoices
            .FirstOrDefaultAsync(x => x.Id == createRequest.PurchaseInvoiceId && x.TenantId == tenantId.Value, cancellationToken);
        if (purchaseInvoice is null)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Purchase invoice not found.");

        if (purchaseInvoice.SupplierId != createRequest.SupplierId)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Purchase invoice does not belong to the specified supplier.");

        var currencyCode = createRequest.CurrencyCode.Trim().ToUpperInvariant();
        if (!string.Equals(purchaseInvoice.CurrencyCode, currencyCode, StringComparison.OrdinalIgnoreCase))
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Payment currency must match invoice currency.");

        if (purchaseInvoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || purchaseInvoice.ReversedAtUtc.HasValue)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = purchaseInvoice.PaidTotal + createRequest.Amount;
        if (nextPaidTotal > purchaseInvoice.GrandTotal)
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        var payment = new VendorPayment
        {
            TenantId = tenantId.Value,
            SupplierId = createRequest.SupplierId,
            PurchaseInvoiceId = createRequest.PurchaseInvoiceId,
            PaymentDate = createRequest.PaymentDate,
            Amount = createRequest.Amount,
            CurrencyCode = currencyCode,
            ReferenceNumber = NormalizeOptional(createRequest.ReferenceNumber),
            PaymentMethod = NormalizeOptional(createRequest.PaymentMethod),
            Notes = NormalizeOptional(createRequest.Notes),
        };

        purchaseInvoice.PaidTotal = nextPaidTotal;
        purchaseInvoice.Status = nextPaidTotal == purchaseInvoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        context.VendorPayments.Add(payment);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult<IEntityResponse<VendorPayment>>.Failure(
                StatusCodes.Status409Conflict,
                "The invoice balance changed while this payment was being allocated. Reload the invoice and try again.");
        }

        return ServiceResult<IEntityResponse<VendorPayment>>.Success(payment.Adapt<VendorPaymentDetailsResponse>());
    }

    protected override IEntityResponse<VendorPayment> BuildEntityResponse(VendorPayment entity)
        => entity.Adapt<VendorPaymentDetailsResponse>();

    protected override Task<VendorPayment> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<VendorPayment> input, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<VendorPayment>(null!);

    protected override Task<VendorPayment> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<VendorPayment>(null!);

    private static ServiceResult<VendorPaymentDetailsResponse> MapResult(ServiceResult<IEntityResponse<VendorPayment>> result)
    {
        if (result.Succeeded)
            return ServiceResult<VendorPaymentDetailsResponse>.Success(result.Value!.Adapt<VendorPaymentDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<VendorPaymentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<VendorPaymentDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? "An error occurred.");
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
