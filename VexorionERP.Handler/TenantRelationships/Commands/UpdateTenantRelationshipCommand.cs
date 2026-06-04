using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTenantRelationshipCommand(Guid RelationshipId, UpdateTenantRelationshipRequest Request) : IRequest<ServiceResult<TenantRelationshipDetailsResponse>>;
