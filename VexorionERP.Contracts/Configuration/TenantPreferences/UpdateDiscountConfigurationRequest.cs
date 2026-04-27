using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Configuration.TenantPreferences;

public class UpdateDiscountConfigurationRequest
{
    [Range(0, 100)]
    public decimal DefaultDiscountPercent { get; set; }

    [Range(0, 100)]
    public decimal MaxManualDiscountPercent { get; set; }

    public bool AllowNegativeDiscount { get; set; }
}
