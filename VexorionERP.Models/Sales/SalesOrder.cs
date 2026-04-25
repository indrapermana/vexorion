using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;

namespace VexorionERP.Models.Sales;

public class SalesOrder : TenantEntityBase
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly RequiredDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string CurrencyCode { get; set; } = "USD";
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }

    public Customer? Customer { get; set; }
    public Warehouse? Warehouse { get; set; }
    public ICollection<SalesOrderLine> Lines { get; set; } = [];
}