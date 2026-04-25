using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Counts;

public class UpdateStockCountLineRequest
{
    [Required]
    public Guid ProductId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "System quantity must be non-negative")]
    public decimal SystemQuantity { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Counted quantity must be non-negative")]
    public decimal CountedQuantity { get; set; }
}
