using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProductCommand(Guid ProductId, UpdateProductRequest Request) : IRequest<ServiceResult<ProductDetailsResponse>>;