using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateSalesInvoiceLineRequest : CreateSalesInvoiceLineRequest, IUpdateLineRequest<SalesInvoiceLine>
{
    public bool IsActive { get; set; } = true;
}
