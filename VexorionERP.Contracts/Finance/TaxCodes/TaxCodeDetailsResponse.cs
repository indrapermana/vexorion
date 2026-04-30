using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class TaxCodeDetailsResponse : IEntityResponse<TaxCode>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal RatePercent { get; set; }
    public bool IsInclusive { get; set; }
}
