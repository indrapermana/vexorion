namespace VexorionERP.Contracts;

public class UpdateSalesInvoiceRequest : CreateSalesInvoiceRequest
{
    public bool IsActive { get; set; } = true;
}
