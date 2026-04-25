using VexorionERP.Contracts.Sales.Payments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ICustomerPaymentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<CustomerPaymentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<CustomerPaymentDetailsResponse>> GetByIdAsync(Guid customerPaymentId, CancellationToken cancellationToken = default);
}