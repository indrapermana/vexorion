namespace VexorionERP.Contracts.Finance.Posting;

public class PostPurchaseInvoiceRequest
{
    public Guid PayableAccountId { get; set; }
    public Guid ExpenseAccountId { get; set; }
    public Guid? TaxReceivableAccountId { get; set; }
    public DateOnly PostingDate { get; set; }
}
