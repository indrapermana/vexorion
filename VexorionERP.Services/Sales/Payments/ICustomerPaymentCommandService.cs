using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ICustomerPaymentCommandService
{
    Task<ServiceResult<CustomerPaymentDetailsResponse>> CreateAsync(CreateCustomerPaymentRequest request, CancellationToken cancellationToken = default);
}
