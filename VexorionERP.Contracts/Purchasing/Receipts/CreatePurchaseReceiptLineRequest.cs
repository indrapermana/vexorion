namespace VexorionERP.Contracts.Purchasing.Receipts;

public class CreatePurchaseReceiptLineRequest
{
    public Guid PurchaseOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal UnitCost { get; set; }
}
