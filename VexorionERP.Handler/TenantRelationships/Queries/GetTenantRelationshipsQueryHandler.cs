using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetTenantRelationshipsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetTenantRelationshipsQuery, TenantRelationship, TenantRelationshipListItemResponse>(serviceProvider);
