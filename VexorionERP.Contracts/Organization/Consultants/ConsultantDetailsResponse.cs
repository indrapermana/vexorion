using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ConsultantDetailsResponse : IEntityResponse<Consultant>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string ConsultantNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? OrganizationName { get; set; }
    public string? Specialty { get; set; }
    public bool IsActive { get; set; }
}
