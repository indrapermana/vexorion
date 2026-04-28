using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class StockCountListItemResponse : IEntityListResponse<StockCount>
{
    public Guid Id { get; set; }
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public DocumentStatus Status { get; set; }
    public bool IsActive { get; set; }
}
