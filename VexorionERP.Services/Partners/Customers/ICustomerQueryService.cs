using VexorionERP.Contracts.Partners.Customers;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ICustomerQueryService
{
    Task<ServiceResult<IReadOnlyCollection<CustomerListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<CustomerDetailsResponse>> GetByIdAsync(Guid customerId, CancellationToken cancellationToken = default);
}