using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class InventoryAdjustmentListItemResponse : IEntityListResponse<InventoryAdjustment>
{
    public Guid Id { get; set; }
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly AdjustmentDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
