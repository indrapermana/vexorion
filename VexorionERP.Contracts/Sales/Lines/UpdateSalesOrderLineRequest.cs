namespace VexorionERP.Contracts.Sales.Lines;

public class UpdateSalesOrderLineRequest : CreateSalesOrderLineRequest
{
    public bool IsActive { get; set; } = true;
}