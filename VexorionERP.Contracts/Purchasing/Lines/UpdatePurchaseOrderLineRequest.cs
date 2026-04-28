using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdatePurchaseOrderLineRequest : CreatePurchaseOrderLineRequest, IUpdateLineRequest<PurchaseOrderLine>
{
    public bool IsActive { get; set; } = true;
}
