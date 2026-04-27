using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Configuration.TenantPreferences;

public class UpdateMenuConfigurationRequest
{
    [Required]
    public IReadOnlyCollection<string> HiddenMenuLinks { get; set; } = [];
}
