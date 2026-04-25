using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Inventory.Transfers;

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