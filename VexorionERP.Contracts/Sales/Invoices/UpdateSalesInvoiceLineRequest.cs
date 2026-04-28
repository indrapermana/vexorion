namespace VexorionERP.Contracts;

public class UpdateSalesInvoiceLineRequest : CreateSalesInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}
