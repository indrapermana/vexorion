using VexorionERP.Models;

namespace VexorionERP.Models;

public class Product : TenantEntityBase
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? Description { get; set; }
    public string UnitOfMeasure { get; set; } = "EA";
    public decimal StandardCost { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal ReorderLevel { get; set; }

    public ICollection<ProductCategoryAssignment> ProductCategoryAssignments { get; set; } = [];
    public ICollection<ProductIdentifier> ProductIdentifiers { get; set; } = [];

    public ICollection<InventoryBalance> InventoryBalances { get; set; } = [];
    public ICollection<InventoryAdjustmentLine> InventoryAdjustmentLines { get; set; } = [];
    public ICollection<StockTransferLine> StockTransferLines { get; set; } = [];
    public ICollection<StockCountLine> StockCountLines { get; set; } = [];
    public ICollection<PurchaseOrderLine> PurchaseOrderLines { get; set; } = [];
    public ICollection<PurchaseInvoiceLine> PurchaseInvoiceLines { get; set; } = [];
    public ICollection<SalesOrderLine> SalesOrderLines { get; set; } = [];
    public ICollection<SalesInvoiceLine> SalesInvoiceLines { get; set; } = [];
}
