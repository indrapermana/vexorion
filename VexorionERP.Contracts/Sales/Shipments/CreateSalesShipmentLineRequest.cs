namespace VexorionERP.Contracts;

public class CreateSalesShipmentLineRequest
{
    public Guid SalesOrderLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal ShippedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
}
