namespace VexorionERP.Contracts.Purchasing.Invoices;

public class UpdatePurchaseInvoiceLineRequest : CreatePurchaseInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}
