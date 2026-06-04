using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateConsultantRequest : ICreateInput<Consultant>
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string ConsultantNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [StringLength(50)]
    public string? PhoneNumber { get; set; }

    [StringLength(250)]
    public string? OrganizationName { get; set; }

    [StringLength(250)]
    public string? Specialty { get; set; }
}
