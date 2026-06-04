using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetActiveTenantRelationshipsQueryHandler(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider)
    : IRequestHandler<GetActiveTenantRelationshipsQuery, ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>> Handle(GetActiveTenantRelationshipsQuery query, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var entities = await dbContext.TenantRelationships
            .GetByTenant(tenantId.Value)
            .AsNoTracking()
            .Where(x => x.Status == TenantRelationshipStatus.Active)
            .Where(x => !x.EffectiveFrom.HasValue || x.EffectiveFrom.Value <= today)
            .Where(x => !x.EffectiveTo.HasValue || x.EffectiveTo.Value >= today)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>.Success(
            entities.Adapt<IReadOnlyCollection<TenantRelationshipListItemResponse>>());
    }
}
