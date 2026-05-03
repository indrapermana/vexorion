using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateInvoiceRequest : CreateInvoiceRequest, IUpdateInput<Invoice>
{
    public bool IsActive { get; set; } = true;
}
