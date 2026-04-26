namespace VexorionERP.Contracts.Finance.Reporting;

public class ArAgingReportResponse
{
    public DateOnly AsOfDate { get; set; }
    public AgingBucketTotalsResponse Totals { get; set; } = new();
    public IReadOnlyCollection<ArAgingItemResponse> Items { get; set; } = [];
}
