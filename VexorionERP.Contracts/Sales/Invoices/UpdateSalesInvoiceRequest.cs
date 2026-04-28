using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateSalesInvoiceRequest : CreateSalesInvoiceRequest, IUpdateInput<SalesInvoice>
{
    public bool IsActive { get; set; } = true;
}
