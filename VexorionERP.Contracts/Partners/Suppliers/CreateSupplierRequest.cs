using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Partners.Suppliers;

public class CreateSupplierRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string SupplierNumber { get; set; } = string.Empty;

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
    public string? Address { get; set; }

    [StringLength(100)]
    public string? PaymentTerms { get; set; }
}