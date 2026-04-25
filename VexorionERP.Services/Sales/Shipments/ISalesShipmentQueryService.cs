using VexorionERP.Contracts.Sales.Shipments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesShipmentQueryService
{
    Task<ServiceResult<List<SalesShipmentListItemResponse>>> GetAllForOrderAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesShipmentDetailsResponse>> GetByIdAsync(Guid shipmentId, CancellationToken cancellationToken = default);
}
