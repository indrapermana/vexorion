namespace VexorionERP.Contracts;

public class UpdatePurchaseOrderLineRequest : CreatePurchaseOrderLineRequest
{
    public bool IsActive { get; set; } = true;
}
