using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IInventoryReportingService
{
    Task<ServiceResult<InventoryValuationReportResponse>> GetValuationAsync(Guid? warehouseId, CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryMovementAuditResponse>> GetMovementAuditAsync(DateOnly? startDate, DateOnly? endDate, Guid? warehouseId, Guid? productId, int skip, int take, CancellationToken cancellationToken = default);
    Task<ServiceResult<InventoryReorderReportResponse>> GetReorderRecommendationsAsync(CancellationToken cancellationToken = default);
}