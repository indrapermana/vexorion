using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProjectCategory : TenantEntityBase
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<Project> Projects { get; set; } = [];
}