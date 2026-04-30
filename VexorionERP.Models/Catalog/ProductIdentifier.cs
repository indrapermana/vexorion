using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProductIdentifier : TenantEntityBase
{
    public Guid ProductId { get; set; }
    public string CodeType { get; set; } = "Barcode";
    public string CodeValue { get; set; } = string.Empty;
    public string NormalizedCodeValue { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }

    public Product? Product { get; set; }
}
