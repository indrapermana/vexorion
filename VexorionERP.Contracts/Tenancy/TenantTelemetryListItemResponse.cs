namespace VexorionERP.Contracts;

public class TenantTelemetryListItemResponse
{
    public Guid TenantId { get; set; }
    public int LoginCount { get; set; }
    public string? MostVisitedPage { get; set; }
    public int MostVisitedPageVisits { get; set; }
}
