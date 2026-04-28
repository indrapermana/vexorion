using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateInvoiceLineRequest : CreateInvoiceLineRequest, IUpdateLineRequest<InvoiceLine>
{
    public bool IsActive { get; set; } = true;
}
