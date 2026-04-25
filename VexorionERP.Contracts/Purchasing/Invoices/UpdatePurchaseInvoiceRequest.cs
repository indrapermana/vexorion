namespace VexorionERP.Contracts.Purchasing.Invoices;

public class UpdatePurchaseInvoiceRequest : CreatePurchaseInvoiceRequest
{
    public bool IsActive { get; set; } = true;
}
