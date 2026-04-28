using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesOrderLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAllAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesOrderLineDetailsResponse>> GetByIdAsync(Guid salesOrderId, Guid salesOrderLineId, CancellationToken cancellationToken = default);
}
