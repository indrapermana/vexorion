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
    ICurrentTenantProvider currentTenantProvider) : ICustomerPaymentCommandService
{
    public async Task<ServiceResult<CustomerPaymentDetailsResponse>> CreateAsync(CreateCustomerPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var validation = Validate(request);
        if (validation.Count > 0)
            return ServiceResult<CustomerPaymentDetailsResponse>.ValidationFailure(validation);

        var customer = await dbContext.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.CustomerId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (customer is null)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.");

        var salesInvoice = await dbContext.SalesInvoices
            .FirstOrDefaultAsync(x => x.Id == request.SalesInvoiceId && x.TenantId == currentTenantProvider.TenantId.Value, cancellationToken);
        if (salesInvoice is null)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales invoice not found.");

        if (salesInvoice.CustomerId != request.CustomerId)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Sales invoice does not belong to the specified customer.");

        var currencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        if (!string.Equals(salesInvoice.CurrencyCode, currencyCode, StringComparison.OrdinalIgnoreCase))
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment currency must match invoice currency.");

        if (salesInvoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || salesInvoice.ReversedAtUtc.HasValue)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payments can only be allocated to active issued invoices.");

        var nextPaidTotal = salesInvoice.PaidTotal + request.Amount;
        if (nextPaidTotal > salesInvoice.GrandTotal)
            return ServiceResult<CustomerPaymentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Payment allocation exceeds the remaining balance.");

        var payment = new CustomerPayment
        {
            TenantId = currentTenantProvider.TenantId.Value,
            CustomerId = request.CustomerId,
            SalesInvoiceId = request.SalesInvoiceId,
            PaymentDate = request.PaymentDate,
            Amount = request.Amount,
            CurrencyCode = currencyCode,
            ReferenceNumber = NormalizeOptional(request.ReferenceNumber),
            PaymentMethod = NormalizeOptional(request.PaymentMethod),
            Notes = NormalizeOptional(request.Notes),
        };

        salesInvoice.PaidTotal = nextPaidTotal;
        salesInvoice.Status = nextPaidTotal == salesInvoice.GrandTotal ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

        dbContext.CustomerPayments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<CustomerPaymentDetailsResponse>.Success(payment.Adapt<CustomerPaymentDetailsResponse>());
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
