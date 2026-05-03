using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CloseShiftRequest
{
    [Range(0, double.MaxValue, ErrorMessage = "Counted cash must be zero or greater.")]
    public decimal CountedCash { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
