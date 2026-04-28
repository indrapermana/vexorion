using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class StockTransferLineDetailsResponse : ILineResponse<StockTransferLine>
{
    public Guid Id { get; set; }
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public bool IsActive { get; set; }
}
