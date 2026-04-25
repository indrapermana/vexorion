using VexorionERP.Models.Common;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Partners;

namespace VexorionERP.Models.Sales;

public class SalesInvoice : TenantEntityBase
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid? SourceSalesOrderId { get; set; }
    public Guid? SourceSalesShipmentId { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public Guid? PaymentTermId { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidTotal { get; set; }
    public decimal BalanceDue => GrandTotal - PaidTotal;
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateTime? PostedAtUtc { get; set; }
    public DateTime? ReversedAtUtc { get; set; }
    public string? Notes { get; set; }

    public Customer? Customer { get; set; }
    public SalesOrder? SourceSalesOrder { get; set; }
    public PaymentTerm? PaymentTerm { get; set; }
    public ICollection<SalesInvoiceLine> Lines { get; set; } = [];
}