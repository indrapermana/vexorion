using System.Security.Claims;
using System.Text.Json;
using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectPartyCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger,
    IHttpContextAccessor httpContextAccessor)
    : BaseLineCommandService<Project, ProjectParty, CreateProjectPartyRequest, UpdateProjectPartyRequest>
{
    protected override async Task<ServiceResult<ILineResponse<ProjectParty>>> CreateAsync(
        Guid projectId,
        CreateProjectPartyRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = ValidateInput(projectId, tenantId.Value, request.RelatedTenantId, request.EffectiveFrom, request.EffectiveTo);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.ValidationFailure(validation);
        }

        if (!await dbContext.Projects.GetByTenant(tenantId.Value).AnyAsync(x => x.Id == projectId, cancellationToken))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status404NotFound, "Project not found.");
        }

        var relationship = await GetActiveRelationshipAsync(tenantId.Value, request.RelatedTenantId, request.RelationshipType, cancellationToken);
        if (relationship is null)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status403Forbidden, "No active tenant relationship allows linking this related tenant to the project.");
        }

        if (!IsWithinRelationshipWindow(request.EffectiveFrom, request.EffectiveTo, relationship.EffectiveFrom, relationship.EffectiveTo))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status400BadRequest, "Project party effective period must be within the active tenant relationship period.");
        }

        if (!RelationshipScopeAllows(relationship.ScopeJson, request.CanViewDocuments, request.CanUploadDocuments, request.CanAssignPeople))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status403Forbidden, "Tenant relationship scope does not allow one or more requested project party permissions.");
        }

        var exists = await dbContext.ProjectParties
            .GetByTenant(tenantId.Value)
            .AnyAsync(
                x => x.ProjectId == projectId
                    && x.RelatedTenantId == request.RelatedTenantId
                    && x.RelationshipType == request.RelationshipType,
                cancellationToken);

        if (exists)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status409Conflict, "This project party already exists for the selected relationship type.");
        }

        var entity = request.Adapt<ProjectParty>();
        entity.ProjectId = projectId;
        entity.TenantId = tenantId.Value;

        dbContext.ProjectParties.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.party.added",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project party added.",
            new { ProjectPartyId = entity.Id, entity.RelatedTenantId, entity.RelationshipType },
            cancellationToken);

        return ServiceResult<ILineResponse<ProjectParty>>.Success(entity.Adapt<ProjectPartyDetailsResponse>());
    }

    protected override async Task<ServiceResult<ILineResponse<ProjectParty>>> UpdateAsync(
        Guid projectId,
        Guid projectPartyId,
        UpdateProjectPartyRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = ValidateInput(projectId, tenantId.Value, request.RelatedTenantId, request.EffectiveFrom, request.EffectiveTo);
        if (validation.Count > 0)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.ValidationFailure(validation);
        }

        var entity = await dbContext.ProjectParties
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Id == projectPartyId, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status404NotFound, "Project party not found.");
        }

        if (!await dbContext.Projects.GetByTenant(tenantId.Value).AnyAsync(x => x.Id == projectId, cancellationToken))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status404NotFound, "Project not found.");
        }

        var relationship = await GetActiveRelationshipAsync(tenantId.Value, request.RelatedTenantId, request.RelationshipType, cancellationToken);
        if (relationship is null)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status403Forbidden, "No active tenant relationship allows linking this related tenant to the project.");
        }

        if (!IsWithinRelationshipWindow(request.EffectiveFrom, request.EffectiveTo, relationship.EffectiveFrom, relationship.EffectiveTo))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status400BadRequest, "Project party effective period must be within the active tenant relationship period.");
        }

        if (!RelationshipScopeAllows(relationship.ScopeJson, request.CanViewDocuments, request.CanUploadDocuments, request.CanAssignPeople))
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status403Forbidden, "Tenant relationship scope does not allow one or more requested project party permissions.");
        }

        var exists = await dbContext.ProjectParties
            .GetByTenant(tenantId.Value)
            .AnyAsync(
                x => x.Id != projectPartyId
                    && x.ProjectId == projectId
                    && x.RelatedTenantId == request.RelatedTenantId
                    && x.RelationshipType == request.RelationshipType,
                cancellationToken);

        if (exists)
        {
            return ServiceResult<ILineResponse<ProjectParty>>.Failure(StatusCodes.Status409Conflict, "This project party already exists for the selected relationship type.");
        }

        request.Adapt(entity);
        entity.ProjectId = projectId;
        entity.TenantId = tenantId.Value;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.party.updated",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project party updated.",
            new { ProjectPartyId = entity.Id, entity.RelatedTenantId, entity.RelationshipType },
            cancellationToken);

        return ServiceResult<ILineResponse<ProjectParty>>.Success(entity.Adapt<ProjectPartyDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid projectId, Guid projectPartyId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.ProjectParties
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Id == projectPartyId, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Project party not found.");
        }

        dbContext.ProjectParties.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project.party.removed",
            tenantId.Value,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(Project),
            projectId.ToString(),
            "Project party removed.",
            new { ProjectPartyId = entity.Id, entity.RelatedTenantId, entity.RelationshipType },
            cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    private async Task<TenantRelationship?> GetActiveRelationshipAsync(
        Guid tenantId,
        Guid relatedTenantId,
        TenantRelationshipType relationshipType,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return await dbContext.TenantRelationships
            .GetByTenant(tenantId)
            .FirstOrDefaultAsync(
                x => x.RelatedTenantId == relatedTenantId
                    && x.RelationshipType == relationshipType
                    && x.Status == TenantRelationshipStatus.Active
                    && x.IsActive
                    && (!x.EffectiveFrom.HasValue || x.EffectiveFrom.Value <= today)
                    && (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= today),
                cancellationToken);
    }

    private static bool IsWithinRelationshipWindow(
        DateOnly? partyFrom,
        DateOnly? partyTo,
        DateOnly? relationshipFrom,
        DateOnly? relationshipTo)
    {
        if (partyFrom.HasValue && relationshipFrom.HasValue && partyFrom.Value < relationshipFrom.Value)
        {
            return false;
        }

        if (partyTo.HasValue && relationshipTo.HasValue && partyTo.Value > relationshipTo.Value)
        {
            return false;
        }

        return true;
    }

    private static Dictionary<string, string[]> ValidateInput(
        Guid projectId,
        Guid tenantId,
        Guid relatedTenantId,
        DateOnly? effectiveFrom,
        DateOnly? effectiveTo)
    {
        var errors = new Dictionary<string, string[]>();

        if (projectId == Guid.Empty)
        {
            errors[nameof(CreateProjectPartyRequest)] = ["Project is required."];
        }

        if (relatedTenantId == Guid.Empty)
        {
            errors[nameof(CreateProjectPartyRequest.RelatedTenantId)] = ["Related tenant is required."];
        }

        if (relatedTenantId == tenantId)
        {
            errors[nameof(CreateProjectPartyRequest.RelatedTenantId)] = ["Related tenant must be different from the current tenant."];
        }

        if (effectiveFrom.HasValue && effectiveTo.HasValue && effectiveTo.Value < effectiveFrom.Value)
        {
            errors[nameof(CreateProjectPartyRequest.EffectiveTo)] = ["EffectiveTo must be greater than or equal to EffectiveFrom."];
        }

        return errors;
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var userId = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private static bool RelationshipScopeAllows(string? scopeJson, bool requestCanView, bool requestCanUpload, bool requestCanAssign)
    {
        // Backward compatibility: no scope JSON means legacy unrestricted relationship scope.
        if (string.IsNullOrWhiteSpace(scopeJson))
        {
            return true;
        }

        try
        {
            using var doc = JsonDocument.Parse(scopeJson);
            var root = doc.RootElement;

            bool Can(string key, params string[] aliases)
            {
                if (TryGetBool(root, key, out var value))
                {
                    return value;
                }

                foreach (var alias in aliases)
                {
                    if (TryGetBool(root, alias, out value))
                    {
                        return value;
                    }
                }

                // If scope JSON exists but key is absent, default to false for explicit tightening.
                return false;
            }

            var allowView = Can("canViewDocuments", "CanViewDocuments", "documentsView", "canView");
            var allowUpload = Can("canUploadDocuments", "CanUploadDocuments", "documentsUpload", "canUpload");
            var allowAssign = Can("canAssignPeople", "CanAssignPeople", "peopleAssign", "canAssign");

            if (requestCanView && !allowView)
            {
                return false;
            }

            if (requestCanUpload && !allowUpload)
            {
                return false;
            }

            if (requestCanAssign && !allowAssign)
            {
                return false;
            }

            return true;
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
}
