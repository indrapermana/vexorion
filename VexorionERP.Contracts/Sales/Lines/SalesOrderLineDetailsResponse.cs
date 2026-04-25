namespace VexorionERP.Contracts.Sales.Lines;

public class SalesOrderLineDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid SalesOrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsActive { get; set; }
}