using VexorionERP.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Sales.Invoices;

public class CreateSalesInvoiceRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid? SourceSalesOrderId { get; set; }
    public Guid? SourceSalesShipmentId { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public DateOnly DueDate { get; set; }
    public Guid? PaymentTermId { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";
    [StringLength(1000)]
    public string? Notes { get; set; }
}
