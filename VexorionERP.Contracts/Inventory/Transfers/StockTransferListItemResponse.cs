using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class StockTransferListItemResponse
{
    public Guid Id { get; set; }
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public DocumentStatus Status { get; set; }
    public bool IsActive { get; set; }
}
