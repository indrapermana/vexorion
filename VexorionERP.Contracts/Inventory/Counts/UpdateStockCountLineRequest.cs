using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateStockCountLineRequest : IUpdateLineRequest<StockCountLine>
{
    [Required]
    public Guid ProductId { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "System quantity must be non-negative")]
    public decimal SystemQuantity { get; set; }
    [Range(0, double.MaxValue, ErrorMessage = "Counted quantity must be non-negative")]
    public decimal CountedQuantity { get; set; }
}
