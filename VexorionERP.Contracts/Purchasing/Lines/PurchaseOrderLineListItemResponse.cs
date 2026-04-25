namespace VexorionERP.Contracts.Purchasing.Lines;

public class PurchaseOrderLineListItemResponse
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsActive { get; set; }
}