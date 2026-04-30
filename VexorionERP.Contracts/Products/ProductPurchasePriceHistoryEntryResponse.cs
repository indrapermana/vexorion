namespace VexorionERP.Contracts;

public class ProductPurchasePriceHistoryEntryResponse
{
    public Guid PurchaseInvoiceLineId { get; set; }
    public Guid PurchaseInvoiceId { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public decimal UnitCost { get; set; }
    public decimal Quantity { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
}
