using VexorionERP.Models.Enums;

namespace VexorionERP.Contracts.Purchasing.Orders;

public class PurchaseOrderDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly ExpectedReceiptDate { get; set; }
    public DocumentStatus Status { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
}