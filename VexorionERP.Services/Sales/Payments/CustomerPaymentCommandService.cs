using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class CustomerPaymentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<CustomerPayment>(currentTenantProvider)
{
    // Compatibility wrapper used by tests and existing code
    public async Task<ServiceResult<CustomerPaymentDetailsResponse>> CreateAsync(CreateCustomerPaymentRequest request, CancellationToken cancellationToken = default)
    {
        var result = await CreateAsync((ICreateInput<CustomerPayment>)request, dbContext, cancellationToken);
        return MapResult(result);
    }

    public override async Task<ServiceResult<IEntityResponse<CustomerPayment>>> CreateAsync(ICreateInput<CustomerPayment> request, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var createRequest = (CreateCustomerPaymentRequest)request;

        var validation = Validate(createRequest);
        if (validation.Count > 0)
            return ServiceResult<IEntityResponse<CustomerPayment>>.ValidationFailure(validation);

        var customer = await context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == createRequest.CustomerId && x.TenantId == tenantId.Value, cancellationToken);
        if (customer is null)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        var salesInvoice = await context.SalesInvoices
            .FirstOrDefaultAsync(x => x.Id == createRequest.SalesInvoiceId && x.TenantId == tenantId.Value, cancellationToken);
        if (salesInvoice is null)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Sales invoice not found.");

        if (salesInvoice.CustomerId != createRequest.CustomerId)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Sales invoice does not belong to the specified customer.");

        var currencyCode = createRequest.CurrencyCode.Trim().ToUpperInvariant();
        if (!string.Equals(salesInvoice.CurrencyCode, currencyCode, StringComparison.OrdinalIgnoreCase))
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Payment currency must match invoice currency.");

        if (salesInvoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || salesInvoice.ReversedAtUtc.HasValue)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = salesInvoice.PaidTotal + createRequest.Amount;
        if (nextPaidTotal + salesInvoice.AppliedCreditTotal > salesInvoice.GrandTotal)
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        var payment = new CustomerPayment
        {
            TenantId = tenantId.Value,
            CustomerId = createRequest.CustomerId,
            SalesInvoiceId = createRequest.SalesInvoiceId,
            PaymentDate = createRequest.PaymentDate,
            Amount = createRequest.Amount,
            CurrencyCode = currencyCode,
            ReferenceNumber = NormalizeOptional(createRequest.ReferenceNumber),
            PaymentMethod = NormalizeOptional(createRequest.PaymentMethod),
            Notes = NormalizeOptional(createRequest.Notes),
        };

        salesInvoice.PaidTotal = nextPaidTotal;
        salesInvoice.Status = nextPaidTotal == salesInvoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        context.CustomerPayments.Add(payment);
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult<IEntityResponse<CustomerPayment>>.Failure(
                StatusCodes.Status409Conflict,
                "The invoice balance changed while this payment was being allocated. Reload the invoice and try again.");
        }

        return ServiceResult<IEntityResponse<CustomerPayment>>.Success(payment.Adapt<CustomerPaymentDetailsResponse>());
    }

    protected override IEntityResponse<CustomerPayment> BuildEntityResponse(CustomerPayment entity)
        => entity.Adapt<CustomerPaymentDetailsResponse>();

    protected override Task<CustomerPayment> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<CustomerPayment> input, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<CustomerPayment>(null!);

    protected override Task<CustomerPayment> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
        => Task.FromResult<CustomerPayment>(null!);

    private static ServiceResult<CustomerPaymentDetailsResponse> MapResult(ServiceResult<IEntityResponse<CustomerPayment>> result)
    {
        if (result.Succeeded)
            return ServiceResult<CustomerPaymentDetailsResponse>.Success(result.Value!.Adapt<CustomerPaymentDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<CustomerPaymentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<CustomerPaymentDetailsResponse>.Failure(result.StatusCode ?? StatusCodes.Status400BadRequest, result.ErrorMessage ?? "An error occurred.");
    }

    private static Dictionary<string, string[]> Validate(CreateCustomerPaymentRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.CustomerId == Guid.Empty)
            errors[nameof(CreateCustomerPaymentRequest.CustomerId)] = ["Customer is required."];
        if (request.SalesInvoiceId == Guid.Empty)
            errors[nameof(CreateCustomerPaymentRequest.SalesInvoiceId)] = ["Sales invoice is required."];
        if (request.Amount <= 0m)
            errors[nameof(CreateCustomerPaymentRequest.Amount)] = ["Amount must be greater than zero."];
        if (string.IsNullOrWhiteSpace(request.CurrencyCode))
            errors[nameof(CreateCustomerPaymentRequest.CurrencyCode)] = ["Currency code is required."];

        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
