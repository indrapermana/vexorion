using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateCustomerCommand(Guid CustomerId, UpdateCustomerRequest Request) : IRequest<ServiceResult<CustomerDetailsResponse>>;
