using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProductCommand(Guid ProductId) : IRequest<ServiceResult<bool>>;