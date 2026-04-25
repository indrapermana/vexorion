using System.ComponentModel.DataAnnotations;
using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Inventory.Counts;

public class UpdateStockCountRequest
{
    [Required]
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string? Notes { get; set; }
}
