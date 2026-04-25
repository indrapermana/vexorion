namespace VexorionERP.Contracts.Billing.Lines;

public class UpdateInvoiceLineRequest : CreateInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}