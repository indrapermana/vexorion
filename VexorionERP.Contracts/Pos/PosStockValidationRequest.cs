namespace VexorionERP.Contracts;

public class PosStockValidationRequest
{
    public List<PosStockValidationLine> Lines { get; set; } = [];
}

public class PosStockValidationLine
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public decimal Quantity { get; set; }
}
