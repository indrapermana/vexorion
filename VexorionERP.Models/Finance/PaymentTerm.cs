using VexorionERP.Models.Common;

namespace VexorionERP.Models.Finance;

public class PaymentTerm : TenantEntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int DaysDue { get; set; }
    public bool IsDefault { get; set; }
}