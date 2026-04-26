namespace VexorionERP.Contracts.Finance.Posting;

public class PostSalesInvoiceRequest
{
    public Guid ReceivableAccountId { get; set; }
    public Guid RevenueAccountId { get; set; }
    public Guid? TaxLiabilityAccountId { get; set; }
    public DateOnly PostingDate { get; set; }
}
