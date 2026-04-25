using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Transfers;

public class CreateStockTransferRequest
{
    [Required]
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public string? Notes { get; set; }
}