using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProductIdentifierCommand(CreateProductIdentifierRequest Request) : IRequest<ServiceResult<ProductIdentifierDetailsResponse>>;
