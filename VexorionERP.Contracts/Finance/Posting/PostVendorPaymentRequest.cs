namespace VexorionERP.Contracts.Finance.Posting;

public class PostVendorPaymentRequest
{
    public Guid PayableAccountId { get; set; }
    public Guid CashAccountId { get; set; }
    public DateOnly PostingDate { get; set; }
}
