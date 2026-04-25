using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Purchasing.Orders;

public class UpdatePurchaseOrderRequest
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly ExpectedReceiptDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string CurrencyCode { get; set; } = "USD";
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}