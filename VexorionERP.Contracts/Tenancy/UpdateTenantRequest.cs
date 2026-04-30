using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class UpdateTenantRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? Domain { get; set; }

    public bool IsActive { get; set; }
}
