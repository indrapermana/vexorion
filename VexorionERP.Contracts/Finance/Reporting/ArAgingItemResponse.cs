namespace VexorionERP.Contracts;

public class ArAgingItemResponse
{
    public Guid CustomerId { get; set; }
    public string CustomerNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = "USD";
    public AgingBucketTotalsResponse Buckets { get; set; } = new();
}
