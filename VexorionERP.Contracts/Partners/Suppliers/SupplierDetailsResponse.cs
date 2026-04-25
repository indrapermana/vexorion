namespace VexorionERP.Contracts.Partners.Suppliers;

public class SupplierDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string SupplierNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? PaymentTerms { get; set; }
    public bool IsActive { get; set; }
}