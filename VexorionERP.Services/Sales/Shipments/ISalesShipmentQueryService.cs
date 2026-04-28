using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISalesShipmentQueryService
{
    Task<ServiceResult<List<SalesShipmentListItemResponse>>> GetAllForOrderAsync(Guid salesOrderId, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesShipmentDetailsResponse>> GetByIdAsync(Guid shipmentId, CancellationToken cancellationToken = default);
}
