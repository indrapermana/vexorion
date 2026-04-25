using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;

namespace VexorionERP.Models.Inventory;

public class StockTransfer : TenantEntityBase
{
    public string TransferNumber { get; set; } = string.Empty;
    public Guid SourceWarehouseId { get; set; }
    public Guid DestinationWarehouseId { get; set; }
    public DateOnly TransferDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string? Notes { get; set; }

    public Warehouse? SourceWarehouse { get; set; }
    public Warehouse? DestinationWarehouse { get; set; }
    public ICollection<StockTransferLine> Lines { get; set; } = [];
}