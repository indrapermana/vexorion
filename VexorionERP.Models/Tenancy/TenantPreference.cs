using VexorionERP.Models;

namespace VexorionERP.Models;

public class TenantPreference : TenantEntityBase
{
    public string MenuHiddenLinksJson { get; set; } = "[]";
    public decimal DefaultDiscountPercent { get; set; }
    public decimal MaxManualDiscountPercent { get; set; } = 25m;
    public bool AllowNegativeDiscount { get; set; }
}
