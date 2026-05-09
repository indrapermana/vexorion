using VexorionERP.Models;

namespace VexorionERP.Models;

public class Project : TenantEntityBase
{
    public Guid ProjectCategoryId { get; set; }
    public string ProjectNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? GovernmentAgency { get; set; }
    public string? SubmissionReference { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public ProjectLifecycleStatus Status { get; set; } = ProjectLifecycleStatus.Draft;
    public string? Notes { get; set; }

    public ProjectCategory? Category { get; set; }
    public ICollection<ProjectParty> Parties { get; set; } = [];
    public ICollection<ProjectAssignment> Assignments { get; set; } = [];
    public ICollection<ProjectDocument> Documents { get; set; } = [];
    public ICollection<DocumentFolder> Folders { get; set; } = [];
}