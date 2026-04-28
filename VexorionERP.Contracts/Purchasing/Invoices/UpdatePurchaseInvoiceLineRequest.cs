using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdatePurchaseInvoiceLineRequest : CreatePurchaseInvoiceLineRequest, IUpdateLineRequest<PurchaseInvoiceLine>
{
    public bool IsActive { get; set; } = true;
}
