namespace VexorionERP.Models.Enums;

public enum InventoryMovementType
{
    PurchaseReceipt = 1,
    SalesReservation = 2,
    SalesReservationRelease = 3,
    SalesShipment = 4,
    InventoryAdjustmentIncrease = 5,
    InventoryAdjustmentDecrease = 6,
    StockTransferOut = 7,
    StockTransferIn = 8,
    StockCountVarianceIncrease = 9,
    StockCountVarianceDecrease = 10
}