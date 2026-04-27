namespace VexorionERP.Contracts.Finance.TaxCodes;

public class TaxCodeDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal RatePercent { get; set; }
    public bool IsInclusive { get; set; }
}
