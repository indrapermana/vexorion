namespace VexorionERP.Contracts.Purchasing.Lines;

public class UpdatePurchaseOrderLineRequest : CreatePurchaseOrderLineRequest
{
    public bool IsActive { get; set; } = true;
}