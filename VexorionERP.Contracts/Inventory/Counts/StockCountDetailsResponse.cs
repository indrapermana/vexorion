using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class StockCountDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public ICollection<StockCountLineDetailsResponse> Lines { get; set; } = [];
}
