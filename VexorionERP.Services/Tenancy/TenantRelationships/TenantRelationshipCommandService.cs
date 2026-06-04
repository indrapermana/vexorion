using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class TenantRelationshipCommandService(ICurrentTenantProvider currentTenantProvider)
    : BaseCommandService<TenantRelationship>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<TenantRelationship> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        var request = (CreateTenantRelationshipRequest)input;
        var validation = Validate(TenantId, request.RelatedTenantId, request.EffectiveFrom, request.EffectiveTo, request.ScopeJson);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override bool ValidateUpdateInput(IUpdateInput<TenantRelationship> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        var request = (UpdateTenantRelationshipRequest)input;
        var validation = Validate(TenantId, request.RelatedTenantId, request.EffectiveFrom, request.EffectiveTo, request.ScopeJson);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<TenantRelationship>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<TenantRelationship> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateTenantRelationshipRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var relatedTenantExists = await context.Tenants
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.RelatedTenantId && x.IsActive, cancellationToken);

        if (!relatedTenantExists)
        {
            return ServiceResult<IEntityResponse<TenantRelationship>>.Failure(
                StatusCodes.Status400BadRequest,
                "Related tenant does not exist or is inactive.");
        }

        var duplicateExists = await context.TenantRelationships
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.RelatedTenantId == request.RelatedTenantId && x.RelationshipType == request.RelationshipType, cancellationToken);

        if (duplicateExists)
        {
            return ServiceResult<IEntityResponse<TenantRelationship>>.Failure(
                StatusCodes.Status409Conflict,
                "A relationship with the same tenant and type already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<TenantRelationship>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<TenantRelationship> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateTenantRelationshipRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var relatedTenantExists = await context.Tenants
            .AsNoTracking()
            .AnyAsync(x => x.Id == request.RelatedTenantId && x.IsActive, cancellationToken);

        if (!relatedTenantExists)
        {
            return ServiceResult<IEntityResponse<TenantRelationship>>.Failure(
                StatusCodes.Status400BadRequest,
                "Related tenant does not exist or is inactive.");
        }

        var duplicateExists = await context.TenantRelationships
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id
                && x.RelatedTenantId == request.RelatedTenantId
                && x.RelationshipType == request.RelationshipType, cancellationToken);

        if (duplicateExists)
        {
            return ServiceResult<IEntityResponse<TenantRelationship>>.Failure(
                StatusCodes.Status409Conflict,
                "A relationship with the same tenant and type already exists.");
        }

        return null;
    }

    public override async Task<TenantRelationship> GetAddToDbObjectAsync(ICreateInput<TenantRelationship> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<TenantRelationship> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<TenantRelationship> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var request = (UpdateTenantRelationshipRequest)input;
        var relationship = await context.TenantRelationships
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (relationship is null)
        {
            return null!;
        }

        relationship.RelatedTenantId = request.RelatedTenantId;
        relationship.RelationshipType = request.RelationshipType;
        relationship.Status = request.Status;
        relationship.EffectiveFrom = request.EffectiveFrom;
        relationship.EffectiveTo = request.EffectiveTo;
        relationship.ContractReference = request.ContractReference;
        relationship.ScopeJson = request.ScopeJson;

        Normalize(relationship);
        return relationship;
    }

    protected override async Task<TenantRelationship> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return null!;
        }

        var relationship = await context.TenantRelationships
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return relationship ?? null!;
    }

    protected override string GetNotFoundMessage() => "Tenant relationship not found.";

    private static Dictionary<string, string[]> Validate(Guid tenantId, Guid relatedTenantId, DateOnly? effectiveFrom, DateOnly? effectiveTo, string? scopeJson)
    {
        var errors = new Dictionary<string, string[]>();

        if (relatedTenantId == Guid.Empty)
        {
            errors[nameof(CreateTenantRelationshipRequest.RelatedTenantId)] = ["Related tenant is required."];
        }

        if (tenantId != Guid.Empty && relatedTenantId == tenantId)
        {
            errors[nameof(CreateTenantRelationshipRequest.RelatedTenantId)] = ["Related tenant must be a different tenant."];
        }

        if (effectiveFrom.HasValue && effectiveTo.HasValue && effectiveTo.Value < effectiveFrom.Value)
        {
            errors[nameof(CreateTenantRelationshipRequest.EffectiveTo)] = ["Effective to date must be greater than or equal to effective from date."];
        }

        if (!string.IsNullOrWhiteSpace(scopeJson))
        {
            try
            {
                JsonDocument.Parse(scopeJson);
            }
            catch (JsonException)
            {
                errors[nameof(CreateTenantRelationshipRequest.ScopeJson)] = ["Scope JSON is not a valid JSON payload."];
            }
        }

        return errors;
    }

    private static void Normalize(TenantRelationship relationship)
    {
        relationship.ContractReference = string.IsNullOrWhiteSpace(relationship.ContractReference)
            ? null
            : relationship.ContractReference.Trim();
        relationship.ScopeJson = string.IsNullOrWhiteSpace(relationship.ScopeJson)
            ? null
            : relationship.ScopeJson.Trim();
    }
}