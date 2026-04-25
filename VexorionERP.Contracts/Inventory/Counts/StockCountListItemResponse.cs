using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Inventory.Counts;

public class StockCountListItemResponse
{
    public Guid Id { get; set; }
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public DocumentStatus Status { get; set; }
    public bool IsActive { get; set; }
}
