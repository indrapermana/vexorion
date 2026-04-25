namespace VexorionERP.Contracts.Sales.Invoices;

public class UpdateSalesInvoiceLineRequest : CreateSalesInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}
