namespace VexorionERP.Contracts;

public class ProductSupplierPurchasePriceSummaryResponse
{
    public Guid SupplierId { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public int PurchaseCount { get; set; }
    public decimal MinUnitCost { get; set; }
    public decimal MaxUnitCost { get; set; }
    public decimal AvgUnitCost { get; set; }
    public decimal LatestUnitCost { get; set; }
    public DateOnly LastPurchaseDate { get; set; }
    public string LatestInvoiceNumber { get; set; } = string.Empty;
    public string LatestCurrencyCode { get; set; } = string.Empty;
}
