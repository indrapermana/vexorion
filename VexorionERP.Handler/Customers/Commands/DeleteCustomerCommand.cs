using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteCustomerCommand(Guid CustomerId) : IRequest<ServiceResult<bool>>;
