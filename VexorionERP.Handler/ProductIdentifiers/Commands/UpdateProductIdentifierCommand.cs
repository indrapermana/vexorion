using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProductIdentifierCommand(Guid IdentifierId, UpdateProductIdentifierRequest Request) : IRequest<ServiceResult<ProductIdentifierDetailsResponse>>;
