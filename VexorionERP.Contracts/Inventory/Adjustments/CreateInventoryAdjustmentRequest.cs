using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateInventoryAdjustmentRequest : ICreateInput<InventoryAdjustment>
{
    [Required]
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly AdjustmentDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
