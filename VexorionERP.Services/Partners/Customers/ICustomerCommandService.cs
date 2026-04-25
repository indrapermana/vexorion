using VexorionERP.Contracts.Partners.Customers;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ICustomerCommandService
{
    Task<ServiceResult<CustomerDetailsResponse>> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<CustomerDetailsResponse>> UpdateAsync(Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid customerId, CancellationToken cancellationToken = default);
}