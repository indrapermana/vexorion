namespace VexorionERP.Contracts;

public class UpdateInvoiceLineRequest : CreateInvoiceLineRequest
{
    public bool IsActive { get; set; } = true;
}
