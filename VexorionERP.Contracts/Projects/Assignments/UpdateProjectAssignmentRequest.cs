using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateProjectAssignmentRequest : CreateProjectAssignmentRequest, IUpdateLineRequest<ProjectAssignment>
{
    public bool IsActive { get; set; } = true;
}
