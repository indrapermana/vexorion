using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProductCommand(CreateProductRequest Request) : IRequest<ServiceResult<ProductDetailsResponse>>;