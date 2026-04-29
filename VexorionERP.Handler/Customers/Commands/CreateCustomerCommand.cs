using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateCustomerCommand(CreateCustomerRequest Request) : IRequest<ServiceResult<CustomerDetailsResponse>>;
