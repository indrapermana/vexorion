using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class OpenShiftRequest
{
    [Range(0, double.MaxValue, ErrorMessage = "Opening float must be zero or greater.")]
    public decimal OpeningFloat { get; set; }

    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";

    [StringLength(200)]
    public string? Notes { get; set; }
}
