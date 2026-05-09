using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProjectAssignment : TenantEntityBase
{
    public Guid ProjectId { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? ConsultantId { get; set; }
    public string RoleTitle { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsPrimaryAssignment { get; set; }
    public string? Notes { get; set; }

    public Project? Project { get; set; }
    public Employee? Employee { get; set; }
    public Consultant? Consultant { get; set; }
}