using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class PurchaseReceiptDetailsResponse : IEntityResponse<PurchaseReceipt>
{
    public Guid Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public Guid PurchaseOrderId { get; set; }
    public string PurchaseOrderNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public DateOnly ReceiptDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset? PostedAtUtc { get; set; }
    public List<PurchaseReceiptLineResponse> Lines { get; set; } = [];
}
