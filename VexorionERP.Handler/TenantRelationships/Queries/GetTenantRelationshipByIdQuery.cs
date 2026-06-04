using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantRelationshipByIdQuery(Guid RelationshipId) : IRequest<ServiceResult<TenantRelationshipDetailsResponse>>;
