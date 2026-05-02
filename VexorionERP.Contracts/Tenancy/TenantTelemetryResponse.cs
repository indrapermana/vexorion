namespace VexorionERP.Contracts;

public class TenantTelemetryResponse
{
    public IReadOnlyCollection<TenantTelemetryListItemResponse> Tenants { get; set; } = [];
}
