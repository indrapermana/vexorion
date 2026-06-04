using System.Text.Json;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectAssignableConsultantsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectAssignableConsultantsQuery, ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>> Handle(
        GetProjectAssignableConsultantsQuery request,
        CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var tenantId = tenantProvider.TenantId.Value;
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var projectExists = await dbContext.Projects
            .GetByTenant(tenantId)
            .AnyAsync(x => x.Id == request.ProjectId, cancellationToken);

        if (!projectExists)
        {
            return ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Project not found.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var parties = await dbContext.ProjectParties
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.ProjectId == request.ProjectId
                && x.CanAssignPeople
                && x.IsActive
                && (!x.EffectiveFrom.HasValue || x.EffectiveFrom.Value <= today)
                && (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= today))
            .Select(x => new { x.RelatedTenantId, x.RelationshipType })
            .Distinct()
            .ToArrayAsync(cancellationToken);

        var relationships = await dbContext.TenantRelationships
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.Status == TenantRelationshipStatus.Active
                && x.IsActive
                && (!x.EffectiveFrom.HasValue || x.EffectiveFrom.Value <= today)
                && (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= today))
            .Select(x => new { x.RelatedTenantId, x.RelationshipType, x.ScopeJson })
            .ToArrayAsync(cancellationToken);

        var relatedTenantIds = parties
            .Where(party => relationships.Any(relationship =>
                relationship.RelatedTenantId == party.RelatedTenantId
                && relationship.RelationshipType == party.RelationshipType
                && RelationshipScopeAllowsAssignment(relationship.ScopeJson)))
            .Select(party => party.RelatedTenantId)
            .Distinct()
            .ToArray();

        var allowedTenantIds = new HashSet<Guid>(relatedTenantIds) { tenantId };

        var consultants = await (
            from consultant in dbContext.Consultants.IgnoreQueryFilters().AsNoTracking()
            join tenant in dbContext.Tenants.IgnoreQueryFilters().AsNoTracking() on consultant.TenantId equals tenant.Id
            where allowedTenantIds.Contains(consultant.TenantId) && consultant.IsActive
            orderby consultant.FullName
            select new ProjectAssignableConsultantListItemResponse
            {
                Id = consultant.Id,
                TenantId = consultant.TenantId,
                TenantCode = tenant.Code,
                TenantName = tenant.Name,
                ConsultantNumber = consultant.ConsultantNumber,
                FullName = consultant.FullName,
                OrganizationName = consultant.OrganizationName,
                IsExternal = consultant.TenantId != tenantId,
                IsActive = consultant.IsActive,
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>.Success(consultants);
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
}