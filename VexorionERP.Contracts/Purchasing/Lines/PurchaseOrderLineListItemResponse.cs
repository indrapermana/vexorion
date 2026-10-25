using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class PurchaseOrderLineListItemResponse : IEntityListResponse<PurchaseOrderLine>
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal RemainingQuantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsActive { get; set; }
}
