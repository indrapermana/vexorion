using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesOrderQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SalesOrderListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesOrderDetailsResponse>> GetByIdAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
}
