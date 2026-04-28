using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class InventoryAdjustmentDetailsResponse : IEntityResponse<InventoryAdjustment>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly AdjustmentDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public ICollection<InventoryAdjustmentLineDetailsResponse> Lines { get; set; } = [];
}
