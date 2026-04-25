using VexorionERP.Contracts.Sales.Payments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ICustomerPaymentCommandService
{
    Task<ServiceResult<CustomerPaymentDetailsResponse>> CreateAsync(CreateCustomerPaymentRequest request, CancellationToken cancellationToken = default);
}