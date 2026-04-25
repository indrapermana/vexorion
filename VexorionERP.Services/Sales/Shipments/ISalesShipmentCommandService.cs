using VexorionERP.Contracts.Sales.Shipments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ISalesShipmentCommandService
{
    Task<ServiceResult<SalesShipmentDetailsResponse>> CreateAsync(CreateSalesShipmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SalesShipmentDetailsResponse>> PostAsync(Guid shipmentId, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid shipmentId, CancellationToken cancellationToken = default);
}
