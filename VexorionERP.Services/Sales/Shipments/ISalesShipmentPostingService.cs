using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface ISalesShipmentPostingService
{
    Task<ServiceResult<SalesShipmentDetailsResponse>> PostAsync(Guid shipmentId, CancellationToken cancellationToken = default);
}
