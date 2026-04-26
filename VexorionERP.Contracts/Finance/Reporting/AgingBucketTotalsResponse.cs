namespace VexorionERP.Contracts.Finance.Reporting;

public class AgingBucketTotalsResponse
{
    public decimal Current { get; set; }
    public decimal Due1To30 { get; set; }
    public decimal Due31To60 { get; set; }
    public decimal Due61To90 { get; set; }
    public decimal DueOver90 { get; set; }
    public decimal Total { get; set; }
}
