using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectAssignmentQueryService(ICurrentTenantProvider currentTenantProvider)
    : BaseLineQueryService<Project, ProjectAssignment>(currentTenantProvider)
{
    protected override string ParentNotFoundMessage => "Project not found.";

    protected override string LineNotFoundMessage => "Project assignment not found.";

    protected override Task<bool> ParentExistsAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
    {
        return context.Projects.GetByTenant(TenantId).AnyAsync(x => x.Id == parentId, cancellationToken);
    }

    protected override async Task<IReadOnlyCollection<IEntityListResponse<ProjectAssignment>>> GetAllForParentCoreAsync(
        Guid parentId,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var items = await context.ProjectAssignments
            .GetByTenant(TenantId)
            .AsNoTracking()
            .Where(x => x.ProjectId == parentId)
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new ProjectAssignmentListItemResponse
            {
                Id = x.Id,
                ProjectId = x.ProjectId,
                EmployeeId = x.EmployeeId,
                ConsultantId = x.ConsultantId,
                AssigneeType = x.EmployeeId.HasValue ? "Employee" : "Consultant",
                AssigneeDisplayName = x.EmployeeId.HasValue
                    ? ((x.Employee != null ? x.Employee.FirstName : string.Empty) + " " + (x.Employee != null ? x.Employee.LastName : string.Empty)).Trim()
                    : (x.Consultant != null ? x.Consultant.FullName : string.Empty),
                RoleTitle = x.RoleTitle,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsPrimaryAssignment = x.IsPrimaryAssignment,
                Notes = x.Notes,
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .ToArrayAsync(cancellationToken);

        return items.Cast<IEntityListResponse<ProjectAssignment>>().ToArray();
    }

    protected override async Task<IEntityResponse<ProjectAssignment>?> GetByIdCoreAsync(
        Guid parentId,
        Guid lineId,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var item = await context.ProjectAssignments
            .GetByTenant(TenantId)
            .AsNoTracking()
            .Where(x => x.ProjectId == parentId && x.Id == lineId)
            .Select(x => new ProjectAssignmentDetailsResponse
            {
                Id = x.Id,
                TenantId = x.TenantId,
                ProjectId = x.ProjectId,
                EmployeeId = x.EmployeeId,
                ConsultantId = x.ConsultantId,
                AssigneeType = x.EmployeeId.HasValue ? "Employee" : "Consultant",
                AssigneeDisplayName = x.EmployeeId.HasValue
                    ? ((x.Employee != null ? x.Employee.FirstName : string.Empty) + " " + (x.Employee != null ? x.Employee.LastName : string.Empty)).Trim()
                    : (x.Consultant != null ? x.Consultant.FullName : string.Empty),
                RoleTitle = x.RoleTitle,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsPrimaryAssignment = x.IsPrimaryAssignment,
                Notes = x.Notes,
                IsActive = x.IsActive,
                CreatedAtUtc = x.CreatedAtUtc,
                UpdatedAtUtc = x.UpdatedAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? null : item;
    }
}
