namespace VexorionERP.Contracts.Partners.Customers;

public class CustomerListItemResponse
{
    public Guid Id { get; set; }
    public string CustomerNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsActive { get; set; }
}