namespace VexorionERP.Contracts;

public class PostCustomerPaymentRequest
{
    public Guid CashAccountId { get; set; }
    public Guid ReceivableAccountId { get; set; }
    public DateOnly PostingDate { get; set; }
}
