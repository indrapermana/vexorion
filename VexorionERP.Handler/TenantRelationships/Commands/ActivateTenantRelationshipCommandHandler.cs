using System.Text.Json;
using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ActivateTenantRelationshipCommandHandler(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider)
    : IRequestHandler<ActivateTenantRelationshipCommand, ServiceResult<TenantRelationshipDetailsResponse>>
{
    public async ValueTask<ServiceResult<TenantRelationshipDetailsResponse>> Handle(ActivateTenantRelationshipCommand command, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<TenantRelationshipDetailsResponse>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var relationship = await dbContext.TenantRelationships
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == command.RelationshipId, cancellationToken);

        if (relationship is null)
        {
            return ServiceResult<TenantRelationshipDetailsResponse>.Failure(
                StatusCodes.Status404NotFound,
                "Tenant relationship not found.");
        }

        if (relationship.Status is TenantRelationshipStatus.Rejected or TenantRelationshipStatus.Ended)
        {
            return ServiceResult<TenantRelationshipDetailsResponse>.Failure(
                StatusCodes.Status409Conflict,
                "Rejected or ended relationships cannot be re-activated.");
        }

        var effectiveFrom = command.Request.EffectiveFrom ?? relationship.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveTo = command.Request.EffectiveTo ?? relationship.EffectiveTo;
        if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
        {
            return ServiceResult<TenantRelationshipDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(ActivateTenantRelationshipRequest.EffectiveTo)] = ["Effective to date must be greater than or equal to effective from date."]
            });
        }

        if (!string.IsNullOrWhiteSpace(command.Request.ScopeJson))
        {
            try
            {
                JsonDocument.Parse(command.Request.ScopeJson);
            }
            catch (JsonException)
            {
                return ServiceResult<TenantRelationshipDetailsResponse>.ValidationFailure(new Dictionary<string, string[]>
                {
                    [nameof(ActivateTenantRelationshipRequest.ScopeJson)] = ["Scope JSON is not a valid JSON payload."]
                });
            }

            relationship.ScopeJson = command.Request.ScopeJson.Trim();
        }

        relationship.Status = TenantRelationshipStatus.Active;
        relationship.EffectiveFrom = effectiveFrom;
        relationship.EffectiveTo = effectiveTo;
        relationship.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<TenantRelationshipDetailsResponse>.Success(relationship.Adapt<TenantRelationshipDetailsResponse>());
    }
}
