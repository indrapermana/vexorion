using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateSalesOrderRequest : IUpdateInput<SalesOrder>
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly RequiredDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public string CurrencyCode { get; set; } = "USD";
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
