using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateStockTransferRequest : IUpdateInput<StockTransfer>
{
    [Required]
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string? Notes { get; set; }
}
