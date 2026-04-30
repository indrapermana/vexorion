namespace VexorionERP.Contracts;

public class ProductSupplierLatestPurchasePriceResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public decimal LatestUnitCost { get; set; }
    public DateOnly InvoiceDate { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
}
