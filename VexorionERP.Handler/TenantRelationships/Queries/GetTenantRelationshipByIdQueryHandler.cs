using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetTenantRelationshipByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetTenantRelationshipByIdQuery, TenantRelationship, TenantRelationshipDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetTenantRelationshipByIdQuery query) => query.RelationshipId;
}
