using System.ComponentModel.DataAnnotations;
using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Inventory.Transfers;

public class UpdateStockTransferRequest
{
    [Required]
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
}