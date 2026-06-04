using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectAssignableConsultantListItemResponse : IEntityListResponse<Consultant>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string ConsultantNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? OrganizationName { get; set; }
    public bool IsExternal { get; set; }
    public bool IsActive { get; set; }
}