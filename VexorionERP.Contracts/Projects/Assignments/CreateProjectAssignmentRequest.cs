using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateProjectAssignmentRequest : ICreateLineRequest<ProjectAssignment>
{
    public Guid? EmployeeId { get; set; }
    public Guid? ConsultantId { get; set; }

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string RoleTitle { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsPrimaryAssignment { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
