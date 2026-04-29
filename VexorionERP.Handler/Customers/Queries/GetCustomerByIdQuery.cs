using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetCustomerByIdQuery(Guid CustomerId) : IRequest<ServiceResult<CustomerDetailsResponse>>;
