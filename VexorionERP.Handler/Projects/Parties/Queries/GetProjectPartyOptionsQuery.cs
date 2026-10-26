using System.Text.Json;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectPartyOptionsQuery(Guid ProjectId) : IRequest<ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>>;

public sealed class GetProjectPartyOptionsQueryHandler(AppDbContext dbContext, ICurrentTenantProvider currentTenantProvider)
    : IRequestHandler<GetProjectPartyOptionsQuery, ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>> Handle(GetProjectPartyOptionsQuery query, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        if (!await dbContext.Projects.GetByTenant(tenantId.Value).AnyAsync(project => project.Id == query.ProjectId, cancellationToken))
            return ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>.Failure(StatusCodes.Status404NotFound, "Project not found.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rows = await (
            from relationship in dbContext.TenantRelationships.GetByTenant(tenantId.Value).AsNoTracking()
            join tenant in dbContext.Tenants.AsNoTracking() on relationship.RelatedTenantId equals tenant.Id
            where relationship.IsActive && relationship.Status == TenantRelationshipStatus.Active
                && tenant.IsActive && tenant.Id != tenantId.Value
                && (!relationship.EffectiveFrom.HasValue || relationship.EffectiveFrom.Value <= today)
                && (!relationship.EffectiveTo.HasValue || relationship.EffectiveTo.Value >= today)
            orderby tenant.Name, tenant.Code, relationship.RelationshipType
            select new { relationship, tenant.Code, tenant.Name })
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProjectPartyOptionResponse>>.Success(rows.Where(row => IsValidScope(row.relationship.ScopeJson)).Select(row => new ProjectPartyOptionResponse(
            row.relationship.RelatedTenantId, row.Code, row.Name, row.relationship.RelationshipType,
            row.relationship.EffectiveFrom, row.relationship.EffectiveTo,
            Allows(row.relationship.ScopeJson, "canViewDocuments", "CanViewDocuments", "documentsView", "canView"),
            Allows(row.relationship.ScopeJson, "canUploadDocuments", "CanUploadDocuments", "documentsUpload", "canUpload"),
            Allows(row.relationship.ScopeJson, "canAssignPeople", "CanAssignPeople", "peopleAssign", "canAssign"))).ToArray());
    }

    private static bool IsValidScope(string? scope)
    {
        if (string.IsNullOrWhiteSpace(scope)) return true;
        try
        {
            using var document = JsonDocument.Parse(scope);
            return document.RootElement.ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool Allows(string? scope, params string[] keys)
    {
        if (string.IsNullOrWhiteSpace(scope)) return true;
        try
        {
            using var document = JsonDocument.Parse(scope);
            if (document.RootElement.ValueKind != JsonValueKind.Object) return false;
            foreach (var key in keys)
            {
                if (!document.RootElement.TryGetProperty(key, out var value)) continue;
                if (value.ValueKind == JsonValueKind.True) return true;
                if (value.ValueKind == JsonValueKind.False) return false;
                if (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var allowed)) return allowed;
            }
        }
        catch (JsonException) { }
        return false;
    }
}