using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class RefreshTokenRequest
{
    [Required]
    [MinLength(32)]
    public string RefreshToken { get; set; } = string.Empty;
}
