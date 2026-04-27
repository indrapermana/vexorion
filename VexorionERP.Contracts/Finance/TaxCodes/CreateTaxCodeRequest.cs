using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Finance.TaxCodes;

public class CreateTaxCodeRequest
{
    [Required]
    [StringLength(30)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string Name { get; set; } = string.Empty;

    [Range(0, 999.9999)]
    public decimal RatePercent { get; set; }

    public bool IsInclusive { get; set; }
}
