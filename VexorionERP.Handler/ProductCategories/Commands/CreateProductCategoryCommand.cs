using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProductCategoryCommand(CreateProductCategoryRequest Request) : IRequest<ServiceResult<ProductCategoryDetailsResponse>>;
