using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateProjectRequest : IUpdateInput<Project>
{
    public Guid ProjectCategoryId { get; set; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string ProjectNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(250, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(250)]
    public string? GovernmentAgency { get; set; }

    [StringLength(100)]
    public string? SubmissionReference { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public ProjectLifecycleStatus Status { get; set; } = ProjectLifecycleStatus.Draft;

    [StringLength(2000)]
    public string? Notes { get; set; }

    public bool IsActive { get; set; } = true;
}
