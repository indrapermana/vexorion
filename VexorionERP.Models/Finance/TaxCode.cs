using VexorionERP.Models;

namespace VexorionERP.Models;

public class TaxCode : TenantEntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal RatePercent { get; set; }
    public bool IsInclusive { get; set; }
}
