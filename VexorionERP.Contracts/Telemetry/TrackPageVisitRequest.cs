using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class TrackPageVisitRequest
{
    [Required]
    [StringLength(256, MinimumLength = 1)]
    public string Path { get; set; } = string.Empty;
}
