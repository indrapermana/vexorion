using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class ForgotPasswordRequest
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string TenantCode { get; set; } = string.Empty;

    [Required]
    [StringLength(256, MinimumLength = 3)]
    public string UserNameOrEmail { get; set; } = string.Empty;

    [RegularExpression("^(en|es|id)$")]
    public string? Locale { get; set; }
}

public class ResetTokenRequest
{
    [Required]
    [StringLength(512, MinimumLength = 20)]
    public string Token { get; set; } = string.Empty;
}

public class CompletePasswordResetRequest
{
    [Required]
    [StringLength(512, MinimumLength = 20)]
    public string Token { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Password)]
    [Compare(nameof(NewPassword))]
    public string ConfirmPassword { get; set; } = string.Empty;

    [RegularExpression("^(en|es|id)$")]
    public string? Locale { get; set; }
}
