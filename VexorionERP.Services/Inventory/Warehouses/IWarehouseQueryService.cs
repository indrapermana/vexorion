using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IWarehouseQueryService
{
    Task<ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<WarehouseDetailsResponse>> GetByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default);
}
