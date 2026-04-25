using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Adjustments;

public class CreateInventoryAdjustmentRequest
{
    [Required]
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly AdjustmentDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}