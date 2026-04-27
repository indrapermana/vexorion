namespace VexorionERP.Contracts.Finance.TaxCodes;

public class TaxCodeListItemResponse
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal RatePercent { get; set; }
    public bool IsInclusive { get; set; }
}
