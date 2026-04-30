using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProductIdentifierCommand(Guid IdentifierId) : IRequest<ServiceResult<bool>>;
