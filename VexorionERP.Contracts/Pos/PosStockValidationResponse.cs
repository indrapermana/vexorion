namespace VexorionERP.Contracts;

public class PosStockValidationResponse
{
    public bool IsValid { get; set; }
    public List<PosStockInsufficientItem> InsufficientItems { get; set; } = [];
}

public class PosStockInsufficientItem
{
    public Guid ProductId { get; set; }
    public decimal Available { get; set; }
    public decimal Requested { get; set; }
}
