using System.Security.Claims;
using System.Text.Json;
using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectAssignmentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger,
    IHttpContextAccessor httpContextAccessor)
    : BaseLineCommandService<Project, ProjectAssignment, CreateProjectAssignmentRequest, UpdateProjectAssignmentRequest>
{
    protected override async Task<ServiceResult<ILineResponse<ProjectAssignment>>> CreateAsync(
        Guid projectId,
        CreateProjectAssignmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = ValidateInput(projectId, request.EmployeeId, request.ConsultantId, request.RoleTitle, request.StartDate, request.EndDate);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.ValidationFailure(validation);
        }

        var projectStatus = await dbContext.Projects
            .GetByTenant(tenantId.Value)
            .Where(x => x.Id == projectId)
            .Select(x => (ProjectLifecycleStatus?)x.Status)
            .FirstOrDefaultAsync(cancellationToken);

        if (!projectStatus.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status404NotFound, "Project not found.");
        }

        var projectConstraintFailure = await ValidateProjectRoleConstraintsAsync(
            tenantId.Value,
            projectId,
            request.StartDate,
            request.EndDate,
            request.IsPrimaryAssignment,
            null,
            projectStatus.Value,
            cancellationToken);
        if (projectConstraintFailure is not null)
        {
            return projectConstraintFailure;
        }

        var assigneeValidation = await ValidateAssigneeAsync(
            tenantId.Value,
            projectId,
            request.EmployeeId,
            request.ConsultantId,
            request.StartDate,
            request.EndDate,
            cancellationToken);
        if (assigneeValidation is not null)
        {
            return assigneeValidation;
        }

        if (await HasOverlappingAssignmentAsync(tenantId.Value, projectId, request.EmployeeId, request.ConsultantId, request.StartDate, request.EndDate, null, cancellationToken))
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status409Conflict, "Assignment date range overlaps with an existing assignment for the same assignee.");
        }

        var entity = request.Adapt<ProjectAssignment>();
        entity.ProjectId = projectId;
        entity.TenantId = tenantId.Value;
        Normalize(entity);

        dbContext.ProjectAssignments.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.assignment.created",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project assignment created.",
            new { ProjectAssignmentId = entity.Id, entity.EmployeeId, entity.ConsultantId, entity.RoleTitle, entity.StartDate, entity.EndDate },
            cancellationToken);

        var response = await BuildDetailsResponseAsync(tenantId.Value, entity, cancellationToken);
        return ServiceResult<ILineResponse<ProjectAssignment>>.Success(response);
    }

    protected override async Task<ServiceResult<ILineResponse<ProjectAssignment>>> UpdateAsync(
        Guid projectId,
        Guid assignmentId,
        UpdateProjectAssignmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = ValidateInput(projectId, request.EmployeeId, request.ConsultantId, request.RoleTitle, request.StartDate, request.EndDate);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.ValidationFailure(validation);
        }

        var projectStatus = await dbContext.Projects
            .GetByTenant(tenantId.Value)
            .Where(x => x.Id == projectId)
            .Select(x => (ProjectLifecycleStatus?)x.Status)
            .FirstOrDefaultAsync(cancellationToken);

        if (!projectStatus.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status404NotFound, "Project not found.");
        }

        var entity = await dbContext.ProjectAssignments
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Id == assignmentId, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status404NotFound, "Project assignment not found.");
        }

        var projectConstraintFailure = await ValidateProjectRoleConstraintsAsync(
            tenantId.Value,
            projectId,
            request.StartDate,
            request.EndDate,
            request.IsPrimaryAssignment,
            assignmentId,
            projectStatus.Value,
            cancellationToken);
        if (projectConstraintFailure is not null)
        {
            return projectConstraintFailure;
        }

        var assigneeValidation = await ValidateAssigneeAsync(
            tenantId.Value,
            projectId,
            request.EmployeeId,
            request.ConsultantId,
            request.StartDate,
            request.EndDate,
            cancellationToken);
        if (assigneeValidation is not null)
        {
            return assigneeValidation;
        }

        if (await HasOverlappingAssignmentAsync(tenantId.Value, projectId, request.EmployeeId, request.ConsultantId, request.StartDate, request.EndDate, assignmentId, cancellationToken))
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status409Conflict, "Assignment date range overlaps with an existing assignment for the same assignee.");
        }

        request.Adapt(entity);
        entity.ProjectId = projectId;
        entity.TenantId = tenantId.Value;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        Normalize(entity);

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.assignment.updated",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project assignment updated.",
            new { ProjectAssignmentId = entity.Id, entity.EmployeeId, entity.ConsultantId, entity.RoleTitle, entity.StartDate, entity.EndDate, entity.IsActive },
            cancellationToken);

        var response = await BuildDetailsResponseAsync(tenantId.Value, entity, cancellationToken);
        return ServiceResult<ILineResponse<ProjectAssignment>>.Success(response);
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid projectId, Guid assignmentId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.ProjectAssignments
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Id == assignmentId, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Project assignment not found.");
        }

        dbContext.ProjectAssignments.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.assignment.removed",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project assignment removed.",
            new { ProjectAssignmentId = entity.Id, entity.EmployeeId, entity.ConsultantId, entity.RoleTitle },
            cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    private async Task<ProjectAssignmentDetailsResponse> BuildDetailsResponseAsync(Guid tenantId, ProjectAssignment entity, CancellationToken cancellationToken)
    {
        var details = entity.Adapt<ProjectAssignmentDetailsResponse>();

        if (entity.EmployeeId.HasValue)
        {
            var employee = await dbContext.Employees
                .GetByTenant(tenantId)
                .AsNoTracking()
                .Where(x => x.Id == entity.EmployeeId.Value)
                .Select(x => new { x.FirstName, x.LastName })
                .FirstOrDefaultAsync(cancellationToken);

            details.AssigneeType = "Employee";
            details.AssigneeDisplayName = employee is null ? string.Empty : $"{employee.FirstName} {employee.LastName}".Trim();
        }
        else if (entity.ConsultantId.HasValue)
        {
            var consultantName = await dbContext.Consultants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(x => x.Id == entity.ConsultantId.Value)
                .Select(x => x.FullName)
                .FirstOrDefaultAsync(cancellationToken);

            details.AssigneeType = "Consultant";
            details.AssigneeDisplayName = consultantName ?? string.Empty;
        }

        return details;
    }

    private async Task<ServiceResult<ILineResponse<ProjectAssignment>>?> ValidateAssigneeAsync(
        Guid tenantId,
        Guid projectId,
        Guid? employeeId,
        Guid? consultantId,
        DateOnly assignmentStartDate,
        DateOnly? assignmentEndDate,
        CancellationToken cancellationToken)
    {
        if (employeeId.HasValue)
        {
            var employeeExists = await dbContext.Employees
                .GetByTenant(tenantId)
                .AnyAsync(x => x.Id == employeeId.Value && x.IsActive, cancellationToken);

            if (!employeeExists)
            {
                return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status400BadRequest, "Employee not found.");
            }
        }

        if (consultantId.HasValue)
        {
            var consultant = await dbContext.Consultants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(x => x.Id == consultantId.Value && x.IsActive)
                .Select(x => new { x.Id, x.TenantId })
                .FirstOrDefaultAsync(cancellationToken);

            if (consultant is null)
            {
                return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(StatusCodes.Status400BadRequest, "Consultant not found.");
            }

            if (consultant.TenantId != tenantId)
            {
                var relationshipAllowsAssignment = await CrossTenantConsultantAssignmentAllowedAsync(
                    tenantId,
                    projectId,
                    consultant.TenantId,
                    assignmentStartDate,
                    assignmentEndDate,
                    cancellationToken);

                var actorUserId = GetActorUserId(httpContextAccessor);

                if (!relationshipAllowsAssignment)
                {
                    await auditLogger.LogAsync(
                        "project.assignment.access.denied",
                        tenantId,
                        actorUserId,
                        null,
                        nameof(Project),
                        projectId.ToString(),
                        "Cross-tenant consultant assignment denied.",
                        new
                        {
                            ProjectId = projectId,
                            ConsultantId = consultant.Id,
                            ConsultantTenantId = consultant.TenantId,
                            AssignmentStartDate = assignmentStartDate,
                            AssignmentEndDate = assignmentEndDate,
                            Reason = "No eligible active relationship/project-party scope for assignment"
                        },
                        cancellationToken);

                    return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(
                        StatusCodes.Status403Forbidden,
                        "Cross-tenant consultant assignment is not allowed for this project or assignment period.");
                }

                await auditLogger.LogAsync(
                    "project.assignment.access.granted",
                    tenantId,
                    actorUserId,
                    null,
                    nameof(Project),
                    projectId.ToString(),
                    "Cross-tenant consultant assignment permitted.",
                    new
                    {
                        ProjectId = projectId,
                        ConsultantId = consultant.Id,
                        ConsultantTenantId = consultant.TenantId,
                        AssignmentStartDate = assignmentStartDate,
                        AssignmentEndDate = assignmentEndDate
                    },
                    cancellationToken);
            }
        }

        return null;
    }

    private async Task<bool> CrossTenantConsultantAssignmentAllowedAsync(
        Guid tenantId,
        Guid projectId,
        Guid consultantTenantId,
        DateOnly assignmentStartDate,
        DateOnly? assignmentEndDate,
        CancellationToken cancellationToken)
    {
        var projectParties = await dbContext.ProjectParties
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.ProjectId == projectId
                && x.RelatedTenantId == consultantTenantId
                && x.CanAssignPeople
                && x.IsActive)
            .ToArrayAsync(cancellationToken);

        if (projectParties.Length == 0)
        {
            return false;
        }

        var activeRelationships = await dbContext.TenantRelationships
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.RelatedTenantId == consultantTenantId
                && x.Status == TenantRelationshipStatus.Active
                && x.IsActive)
            .ToArrayAsync(cancellationToken);

        if (activeRelationships.Length == 0)
        {
            return false;
        }

        foreach (var party in projectParties)
        {
            if (!IsWithinWindow(assignmentStartDate, assignmentEndDate, party.EffectiveFrom, party.EffectiveTo))
            {
                continue;
            }

            foreach (var relationship in activeRelationships)
            {
                if (relationship.RelationshipType != party.RelationshipType)
                {
                    continue;
                }

                if (!IsWithinWindow(assignmentStartDate, assignmentEndDate, relationship.EffectiveFrom, relationship.EffectiveTo))
                {
                    continue;
                }

                if (!RelationshipScopeAllowsAssignment(relationship.ScopeJson))
                {
                    continue;
                }

                return true;
            }
        }

        return false;
    }

    private static bool IsWithinWindow(
        DateOnly assignmentStart,
        DateOnly? assignmentEnd,
        DateOnly? windowFrom,
        DateOnly? windowTo)
    {
        if (windowFrom.HasValue && assignmentStart < windowFrom.Value)
        {
            return false;
        }

        if (assignmentEnd.HasValue && windowTo.HasValue && assignmentEnd.Value > windowTo.Value)
        {
            return false;
        }

        return true;
    }

    private static bool RelationshipScopeAllowsAssignment(string? scopeJson)
    {
        if (string.IsNullOrWhiteSpace(scopeJson))
        {
            return true;
        }

        try
        {
            using var doc = JsonDocument.Parse(scopeJson);
            var root = doc.RootElement;

            if (TryGetBool(root, "canAssignPeople", out var canAssign)
                || TryGetBool(root, "CanAssignPeople", out canAssign)
                || TryGetBool(root, "peopleAssign", out canAssign)
                || TryGetBool(root, "canAssign", out canAssign))
            {
                return canAssign;
            }

            return false;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool TryGetBool(JsonElement root, string propertyName, out bool value)
    {
        value = false;
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return false;
        }

        if (property.ValueKind == JsonValueKind.True)
        {
            value = true;
            return true;
        }

        if (property.ValueKind == JsonValueKind.False)
        {
            value = false;
            return true;
        }

        if (property.ValueKind == JsonValueKind.String && bool.TryParse(property.GetString(), out var parsed))
        {
            value = parsed;
            return true;
        }

        return false;
    }

    private async Task<bool> HasOverlappingAssignmentAsync(
        Guid tenantId,
        Guid projectId,
        Guid? employeeId,
        Guid? consultantId,
        DateOnly startDate,
        DateOnly? endDate,
        Guid? excludedAssignmentId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ProjectAssignments
            .GetByTenant(tenantId)
            .Where(x => x.ProjectId == projectId && x.IsActive);

        if (excludedAssignmentId.HasValue)
        {
            query = query.Where(x => x.Id != excludedAssignmentId.Value);
        }

        if (employeeId.HasValue)
        {
            query = query.Where(x => x.EmployeeId == employeeId.Value);
        }
        else if (consultantId.HasValue)
        {
            query = query.Where(x => x.ConsultantId == consultantId.Value);
        }

        query = query.Where(x => !x.EndDate.HasValue || x.EndDate.Value >= startDate);

        if (endDate.HasValue)
        {
            query = query.Where(x => x.StartDate <= endDate.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    private async Task<ServiceResult<ILineResponse<ProjectAssignment>>?> ValidateProjectRoleConstraintsAsync(
        Guid tenantId,
        Guid projectId,
        DateOnly startDate,
        DateOnly? endDate,
        bool isPrimaryAssignment,
        Guid? excludedAssignmentId,
        ProjectLifecycleStatus projectStatus,
        CancellationToken cancellationToken)
    {
        if (projectStatus is ProjectLifecycleStatus.Completed or ProjectLifecycleStatus.Cancelled)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(
                StatusCodes.Status409Conflict,
                "Assignments cannot be changed when the project is completed or cancelled.");
        }

        if (!isPrimaryAssignment)
        {
            return null;
        }

        var primaryQuery = dbContext.ProjectAssignments
            .GetByTenant(tenantId)
            .Where(x => x.ProjectId == projectId && x.IsActive && x.IsPrimaryAssignment);

        if (excludedAssignmentId.HasValue)
        {
            primaryQuery = primaryQuery.Where(x => x.Id != excludedAssignmentId.Value);
        }

        primaryQuery = primaryQuery.Where(x => !x.EndDate.HasValue || x.EndDate.Value >= startDate);
        if (endDate.HasValue)
        {
            primaryQuery = primaryQuery.Where(x => x.StartDate <= endDate.Value);
        }

        var hasOverlappingPrimary = await primaryQuery.AnyAsync(cancellationToken);
        if (hasOverlappingPrimary)
        {
            return ServiceResult<ILineResponse<ProjectAssignment>>.Failure(
                StatusCodes.Status409Conflict,
                "Only one active primary assignment is allowed for the same project period.");
        }

        return null;
    }

    private static Dictionary<string, string[]> ValidateInput(
        Guid projectId,
        Guid? employeeId,
        Guid? consultantId,
        string roleTitle,
        DateOnly startDate,
        DateOnly? endDate)
    {
        var errors = new Dictionary<string, string[]>();

        if (projectId == Guid.Empty)
        {
            errors[nameof(CreateProjectAssignmentRequest)] = ["Project is required."];
        }

        if (!employeeId.HasValue && !consultantId.HasValue)
        {
            errors[nameof(CreateProjectAssignmentRequest.EmployeeId)] = ["Either employeeId or consultantId is required."];
        }

        if (employeeId.HasValue && consultantId.HasValue)
        {
            errors[nameof(CreateProjectAssignmentRequest.EmployeeId)] = ["Provide only one assignee type: employee or consultant."];
        }

        if (string.IsNullOrWhiteSpace(roleTitle))
        {
            errors[nameof(CreateProjectAssignmentRequest.RoleTitle)] = ["Role title is required."];
        }

        if (endDate.HasValue && endDate.Value < startDate)
        {
            errors[nameof(CreateProjectAssignmentRequest.EndDate)] = ["EndDate must be greater than or equal to StartDate."];
        }

        return errors;
    }

    private static void Normalize(ProjectAssignment assignment)
    {
        assignment.RoleTitle = assignment.RoleTitle.Trim();
        assignment.Notes = string.IsNullOrWhiteSpace(assignment.Notes) ? null : assignment.Notes.Trim();
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var userId = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
