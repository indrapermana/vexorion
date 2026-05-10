using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectListItemResponse : IEntityListResponse<Project>
{
    public Guid Id { get; set; }
    public Guid ProjectCategoryId { get; set; }
    public string ProjectNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public ProjectLifecycleStatus Status { get; set; }
    public bool IsActive { get; set; }
}
