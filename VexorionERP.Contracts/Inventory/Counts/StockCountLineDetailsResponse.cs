namespace VexorionERP.Contracts;

public class StockCountLineDetailsResponse
{
    public Guid Id { get; set; }
    public Guid StockCountId { get; set; }
    public Guid ProductId { get; set; }
    public decimal SystemQuantity { get; set; }
    public decimal CountedQuantity { get; set; }
    public decimal VarianceQuantity => CountedQuantity - SystemQuantity;
    public bool IsActive { get; set; }
}
