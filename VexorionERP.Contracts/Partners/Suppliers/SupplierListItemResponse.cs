namespace VexorionERP.Contracts.Partners.Suppliers;

public class SupplierListItemResponse
{
    public Guid Id { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}