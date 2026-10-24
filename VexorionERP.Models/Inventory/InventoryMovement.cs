using VexorionERP.Models;

namespace VexorionERP.Models;

public class InventoryMovement : TenantEntityBase
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public InventoryMovementType MovementType { get; set; }
    public decimal Quantity { get; set; }
    public decimal QuantityOnHandDelta { get; set; }
    public decimal QuantityReservedDelta { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public Guid? PurchaseOrderId { get; set; }
    public Guid? PurchaseOrderLineId { get; set; }
    public Guid? SalesOrderId { get; set; }
    public Guid? SalesOrderLineId { get; set; }
    public Guid? InventoryAdjustmentId { get; set; }
    public Guid? InventoryAdjustmentLineId { get; set; }
    public Guid? StockTransferId { get; set; }
    public Guid? StockTransferLineId { get; set; }
    public Guid? PurchaseReceiptId { get; set; }
    public Guid? PurchaseReceiptLineId { get; set; }
    public Guid? SalesShipmentId { get; set; }
    public Guid? SalesShipmentLineId { get; set; }
    public Guid? PosRefundRecordId { get; set; }

    public Product? Product { get; set; }
    public Warehouse? Warehouse { get; set; }
}
