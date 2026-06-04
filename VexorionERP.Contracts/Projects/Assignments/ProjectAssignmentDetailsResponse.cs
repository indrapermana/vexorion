using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectAssignmentDetailsResponse : ILineResponse<ProjectAssignment>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? ConsultantId { get; set; }
    public string AssigneeType { get; set; } = string.Empty;
    public string AssigneeDisplayName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsPrimaryAssignment { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
