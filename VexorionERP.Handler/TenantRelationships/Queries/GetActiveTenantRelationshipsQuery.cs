using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetActiveTenantRelationshipsQuery : IRequest<ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>>;
