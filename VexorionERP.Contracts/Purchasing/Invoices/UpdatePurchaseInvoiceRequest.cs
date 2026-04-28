namespace VexorionERP.Contracts;

public class UpdatePurchaseInvoiceRequest : CreatePurchaseInvoiceRequest
{
    public bool IsActive { get; set; } = true;
}
