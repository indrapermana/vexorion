using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateWarehouseRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? LocationDescription { get; set; }
}
