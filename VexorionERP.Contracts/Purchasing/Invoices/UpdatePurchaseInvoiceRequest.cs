using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdatePurchaseInvoiceRequest : CreatePurchaseInvoiceRequest, IUpdateInput<PurchaseInvoice>
{
    public bool IsActive { get; set; } = true;
}
