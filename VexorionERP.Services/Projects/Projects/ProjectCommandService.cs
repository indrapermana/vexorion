using System.Security.Claims;
using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectCommandService(
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger,
    IHttpContextAccessor httpContextAccessor)
    : BaseCommandService<Project>(currentTenantProvider)
{
    public override async Task<ServiceResult<IEntityResponse<Project>>> CreateAsync(
        ICreateInput<Project> request,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var result = await base.CreateAsync(request, dbContext, cancellationToken);
        if (result.Succeeded)
        {
            var details = result.Value as ProjectDetailsResponse ?? result.Value!.Adapt<ProjectDetailsResponse>();
            await auditLogger.LogAsync(
                "project.created",
                TryGetTenantId(),
                GetActorUserId(httpContextAccessor),
                null,
                nameof(Project),
                details.Id.ToString(),
                "Project created.",
                new { details.ProjectNumber, details.Name, details.Status },
                cancellationToken);
        }

        return result;
    }

    public override async Task<ServiceResult<IEntityResponse<Project>>> UpdateAsync(
        Guid id,
        IUpdateInput<Project> request,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        ProjectLifecycleStatus? previousStatus = null;
        var tenantId = TryGetTenantId();
        if (tenantId.HasValue)
        {
            previousStatus = await dbContext.Projects
                .GetByTenant(tenantId.Value)
                .Where(x => x.Id == id)
                .Select(x => (ProjectLifecycleStatus?)x.Status)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var result = await base.UpdateAsync(id, request, dbContext, cancellationToken);
        if (result.Succeeded)
        {
            var details = result.Value as ProjectDetailsResponse ?? result.Value!.Adapt<ProjectDetailsResponse>();
            var statusChanged = previousStatus.HasValue && previousStatus.Value != details.Status;

            await auditLogger.LogAsync(
                statusChanged ? "project.status_changed" : "project.updated",
                TryGetTenantId(),
                GetActorUserId(httpContextAccessor),
                null,
                nameof(Project),
                details.Id.ToString(),
                statusChanged ? "Project status changed." : "Project updated.",
                new { PreviousStatus = previousStatus, NewStatus = details.Status, details.ProjectNumber, details.Name },
                cancellationToken);
        }

        return result;
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        string? projectNumber = null;
        if (tenantId.HasValue)
        {
            projectNumber = await dbContext.Projects
                .GetByTenant(tenantId.Value)
                .Where(x => x.Id == id)
                .Select(x => x.ProjectNumber)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var result = await base.DeleteAsync(id, dbContext, cancellationToken);
        if (result.Succeeded)
        {
            await auditLogger.LogAsync(
                "project.deleted",
                tenantId,
                GetActorUserId(httpContextAccessor),
                null,
                nameof(Project),
                id.ToString(),
                "Project deleted.",
                new { ProjectNumber = projectNumber },
                cancellationToken);
        }

        return result;
    }

    protected override async Task<ServiceResult<IEntityResponse<Project>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Project> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProjectRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var tenantExists = await context.Tenants
            .AsNoTracking()
            .AnyAsync(x => x.Id == tenantId.Value && x.IsActive, cancellationToken);

        if (!tenantExists)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status400BadRequest,
                "Current tenant is not available.");
        }

        var actorUserId = GetActorUserId(httpContextAccessor);
        if (actorUserId.HasValue)
        {
            var actorBelongsToTenant = await context.Users
                .AsNoTracking()
                .AnyAsync(x => x.Id == actorUserId.Value && x.TenantId == tenantId.Value && x.IsActive, cancellationToken);

            if (!actorBelongsToTenant)
            {
                return ServiceResult<IEntityResponse<Project>>.Failure(
                    StatusCodes.Status403Forbidden,
                    "You can only create projects for your own tenant.");
            }
        }

        var dateError = ValidateDateRange(request.StartDate, request.EndDate);
        if (dateError is not null)
        {
            return dateError;
        }

        var categoryExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.ProjectCategoryId, cancellationToken);

        if (!categoryExists)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status400BadRequest,
                "Project category not found.");
        }

        var normalizedNumber = NormalizeProjectNumber(request.ProjectNumber);
        var exists = await context.Projects
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ProjectNumber == normalizedNumber, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status409Conflict,
                "A project with the same project number already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<Project>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Project> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProjectRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var dateError = ValidateDateRange(request.StartDate, request.EndDate);
        if (dateError is not null)
        {
            return dateError;
        }

        var categoryExists = await context.ProjectCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id == request.ProjectCategoryId, cancellationToken);

        if (!categoryExists)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status400BadRequest,
                "Project category not found.");
        }

        var normalizedNumber = NormalizeProjectNumber(request.ProjectNumber);
        var exists = await context.Projects
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ProjectNumber == normalizedNumber && x.Id != id, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status409Conflict,
                "A project with the same project number already exists.");
        }

        var currentStatus = await context.Projects
            .GetByTenant(tenantId.Value)
            .Where(x => x.Id == id)
            .Select(x => (ProjectLifecycleStatus?)x.Status)
            .FirstOrDefaultAsync(cancellationToken);

        if (currentStatus.HasValue && !CanTransition(currentStatus.Value, request.Status))
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status400BadRequest,
                $"Invalid status transition from {currentStatus.Value} to {request.Status}.");
        }

        return null;
    }

    public override Task<Project> GetAddToDbObjectAsync(
        ICreateInput<Project> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProjectRequest)input;
        var entity = new Project
        {
            ProjectCategoryId = request.ProjectCategoryId,
            ProjectNumber = NormalizeProjectNumber(request.ProjectNumber),
            Name = NormalizeRequired(request.Name),
            GovernmentAgency = NormalizeOptional(request.GovernmentAgency),
            SubmissionReference = NormalizeOptional(request.SubmissionReference),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status,
            Notes = NormalizeOptional(request.Notes)
        };

        return Task.FromResult(entity);
    }

    protected override async Task<Project> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<Project> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProjectRequest)input;
        var entity = await context.Projects
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null!;
        }

        entity.ProjectCategoryId = request.ProjectCategoryId;
        entity.ProjectNumber = NormalizeProjectNumber(request.ProjectNumber);
        entity.Name = NormalizeRequired(request.Name);
        entity.GovernmentAgency = NormalizeOptional(request.GovernmentAgency);
        entity.SubmissionReference = NormalizeOptional(request.SubmissionReference);
        entity.StartDate = request.StartDate;
        entity.EndDate = request.EndDate;
        entity.Status = request.Status;
        entity.Notes = NormalizeOptional(request.Notes);
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<Project> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.Projects
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity!;
    }

    private static ServiceResult<IEntityResponse<Project>>? ValidateDateRange(DateOnly startDate, DateOnly? endDate)
    {
        if (endDate.HasValue && endDate.Value < startDate)
        {
            return ServiceResult<IEntityResponse<Project>>.Failure(
                StatusCodes.Status400BadRequest,
                "End date must be greater than or equal to start date.");
        }

        return null;
    }

    private static string NormalizeProjectNumber(string value) => value.Trim().ToUpperInvariant();

    private static string NormalizeRequired(string value) => value.Trim();

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool CanTransition(ProjectLifecycleStatus from, ProjectLifecycleStatus to)
    {
        if (from == to)
        {
            return true;
        }

        return from switch
        {
            ProjectLifecycleStatus.Draft => to is ProjectLifecycleStatus.InReview or ProjectLifecycleStatus.Cancelled,
            ProjectLifecycleStatus.InReview => to is ProjectLifecycleStatus.Draft or ProjectLifecycleStatus.Submitted or ProjectLifecycleStatus.Cancelled,
            ProjectLifecycleStatus.Submitted => to is ProjectLifecycleStatus.InReview or ProjectLifecycleStatus.Awarded or ProjectLifecycleStatus.Cancelled,
            ProjectLifecycleStatus.Awarded => to is ProjectLifecycleStatus.Completed or ProjectLifecycleStatus.Cancelled,
            ProjectLifecycleStatus.Completed => false,
            ProjectLifecycleStatus.Cancelled => false,
            _ => false
        };
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var userId = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
