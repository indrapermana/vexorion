using VexorionERP.Models.Enums;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IInventoryMovementPostingService
{
    Task<ServiceResult<bool>> ApplyPurchaseOrderStatusChangeAsync(PurchaseOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> ApplySalesOrderStatusChangeAsync(SalesOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default);
}