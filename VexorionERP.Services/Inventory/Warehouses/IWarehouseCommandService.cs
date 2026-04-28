using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IWarehouseCommandService
{
    Task<ServiceResult<WarehouseDetailsResponse>> CreateAsync(CreateWarehouseRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<WarehouseDetailsResponse>> UpdateAsync(Guid warehouseId, UpdateWarehouseRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid warehouseId, CancellationToken cancellationToken = default);
}
