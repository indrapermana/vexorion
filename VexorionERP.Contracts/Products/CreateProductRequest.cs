using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateProductRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Sku { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required]
    [StringLength(20, MinimumLength = 1)]
    public string UnitOfMeasure { get; set; } = "EA";
    public decimal StandardCost { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }
}
