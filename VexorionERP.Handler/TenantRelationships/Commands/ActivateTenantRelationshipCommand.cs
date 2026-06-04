using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record ActivateTenantRelationshipCommand(Guid RelationshipId, ActivateTenantRelationshipRequest Request) : IRequest<ServiceResult<TenantRelationshipDetailsResponse>>;
