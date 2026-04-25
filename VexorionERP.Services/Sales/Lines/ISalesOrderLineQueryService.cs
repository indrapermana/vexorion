using VexorionERP.Contracts.Sales.Lines;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesOrderLineQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SalesOrderLineListItemResponse>>> GetAllAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesOrderLineDetailsResponse>> GetByIdAsync(Guid salesOrderId, Guid salesOrderLineId, CancellationToken cancellationToken = default);
}