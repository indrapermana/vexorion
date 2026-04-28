using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateCustomerRequest : ICreateInput<Customer>
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string CustomerNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    public string? ContactName { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? PhoneNumber { get; set; }

    [StringLength(300)]
    public string? BillingAddress { get; set; }

    [StringLength(300)]
    public string? ShippingAddress { get; set; }
    public decimal CreditLimit { get; set; }
}
