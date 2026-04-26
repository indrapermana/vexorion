namespace VexorionERP.Contracts.Finance.Reporting;

public class ApAgingItemResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = "USD";
    public AgingBucketTotalsResponse Buckets { get; set; } = new();
}
