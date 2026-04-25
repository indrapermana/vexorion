namespace VexorionERP.Contracts.Sales.Invoices;

public class UpdateSalesInvoiceRequest : CreateSalesInvoiceRequest
{
    public bool IsActive { get; set; } = true;
}
