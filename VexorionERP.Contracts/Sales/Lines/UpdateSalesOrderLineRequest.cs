namespace VexorionERP.Contracts;

public class UpdateSalesOrderLineRequest : CreateSalesOrderLineRequest
{
    public bool IsActive { get; set; } = true;
}
