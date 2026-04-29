using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteAccountCommand(Guid AccountId) : IRequest<ServiceResult<bool>>;
