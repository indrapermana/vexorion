namespace VexorionERP.Contracts.Inventory.Transfers;

public class StockTransferLineDetailsResponse
{
    public Guid Id { get; set; }
    public Guid StockTransferId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public bool IsActive { get; set; }
}