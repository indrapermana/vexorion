namespace VexorionERP.Contracts;

public class UpdatePurchaseInvoiceLineRequest : CreatePurchaseInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}
