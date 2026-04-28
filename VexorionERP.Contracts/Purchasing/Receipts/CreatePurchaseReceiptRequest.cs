using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreatePurchaseReceiptRequest : ICreateInput<PurchaseReceipt>
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public Guid PurchaseOrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly ReceiptDate { get; set; }
    public string? Notes { get; set; }
    public List<CreatePurchaseReceiptLineRequest> Lines { get; set; } = [];
}
