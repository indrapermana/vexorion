using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantRelationshipsQuery : IRequest<ServiceResult<IReadOnlyCollection<TenantRelationshipListItemResponse>>>;
