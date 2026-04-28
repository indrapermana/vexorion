using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class UpdateMenuConfigurationRequest
{
    [Required]
    public IReadOnlyCollection<string> HiddenMenuLinks { get; set; } = [];
}
