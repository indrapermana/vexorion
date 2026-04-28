namespace VexorionERP.Contracts;

public class TenantPreferencesResponse
{
    public IReadOnlyCollection<string> HiddenMenuLinks { get; set; } = [];
    public decimal DefaultDiscountPercent { get; set; }
    public decimal MaxManualDiscountPercent { get; set; }
    public bool AllowNegativeDiscount { get; set; }
}
