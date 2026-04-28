namespace VexorionERP.Contracts;

public class CustomerDetailsResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string CustomerNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public decimal CreditLimit { get; set; }
    public bool IsActive { get; set; }
}
