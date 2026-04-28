using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateStockCountRequest
{
    [Required]
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public string? Notes { get; set; }
}
