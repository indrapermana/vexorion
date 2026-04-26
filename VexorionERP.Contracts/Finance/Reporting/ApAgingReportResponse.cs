namespace VexorionERP.Contracts.Finance.Reporting;

public class ApAgingReportResponse
{
    public DateOnly AsOfDate { get; set; }
    public AgingBucketTotalsResponse Totals { get; set; } = new();
    public IReadOnlyCollection<ApAgingItemResponse> Items { get; set; } = [];
}
