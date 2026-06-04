using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateTenantRelationshipCommand(CreateTenantRelationshipRequest Request) : IRequest<ServiceResult<TenantRelationshipDetailsResponse>>;
