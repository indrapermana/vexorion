using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProductIdentifierByIdQuery(Guid IdentifierId) : IRequest<ServiceResult<ProductIdentifierDetailsResponse>>;
