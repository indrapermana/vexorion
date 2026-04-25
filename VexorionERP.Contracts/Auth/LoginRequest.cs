using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Auth;

public class LoginRequest
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string TenantCode { get; set; } = string.Empty;

    [Required]
    [StringLength(256, MinimumLength = 3)]
    public string UserNameOrEmail { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}