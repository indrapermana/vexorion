using VexorionERP.Models;

namespace VexorionERP.Models;

public class Consultant : TenantEntityBase
{
    public string ConsultantNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? OrganizationName { get; set; }
    public string? Specialty { get; set; }

    public ICollection<ProjectAssignment> Assignments { get; set; } = [];
}