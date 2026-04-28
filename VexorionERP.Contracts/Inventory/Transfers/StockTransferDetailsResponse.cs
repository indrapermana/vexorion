using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class StockTransferDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public ICollection<StockTransferLineDetailsResponse> Lines { get; set; } = [];
}
