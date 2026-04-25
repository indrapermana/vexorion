using VexorionERP.Models.Common;
using VexorionERP.Models.Purchasing;

namespace VexorionERP.Models.Partners;

public class Supplier : TenantEntityBase
{
    public string SupplierNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? PaymentTerms { get; set; }

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
    public ICollection<PurchaseInvoice> PurchaseInvoices { get; set; } = [];
}