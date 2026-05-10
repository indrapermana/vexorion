using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectCategoryListItemResponse : IEntityListResponse<ProjectCategory>
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}
