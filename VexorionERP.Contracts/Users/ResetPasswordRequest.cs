using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Users;

public class ResetPasswordRequest
{
    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}