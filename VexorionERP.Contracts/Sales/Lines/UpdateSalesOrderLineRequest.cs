using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateSalesOrderLineRequest : CreateSalesOrderLineRequest, IUpdateLineRequest<SalesOrderLine>
{
    public bool IsActive { get; set; } = true;
}
