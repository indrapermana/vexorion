using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class PurchaseReceiptListItemResponse
{
    public Guid Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public Guid PurchaseOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public DateOnly ReceiptDate { get; set; }
    public DocumentStatus Status { get; set; }
    public DateTimeOffset? PostedAtUtc { get; set; }
    public int LineCount { get; set; }
}
