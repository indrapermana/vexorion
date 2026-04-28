using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class OnboardTenantRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string TenantName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string TenantCode { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Domain { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string CompanyCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string AdminUserName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string AdminEmail { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, MinimumLength = 8)]
    public string AdminPassword { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;
}
