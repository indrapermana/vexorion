namespace VexorionERP.Models;

public class PosRefundLine : TenantEntityBase
{
    public Guid PosRefundRecordId { get; set; }
    public Guid SalesInvoiceLineId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public bool ReturnToStock { get; set; }

    public PosRefundRecord? Refund { get; set; }
    public SalesInvoiceLine? SalesInvoiceLine { get; set; }
}