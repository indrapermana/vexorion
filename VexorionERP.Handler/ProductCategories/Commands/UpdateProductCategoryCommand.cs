using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProductCategoryCommand(Guid CategoryId, UpdateProductCategoryRequest Request) : IRequest<ServiceResult<ProductCategoryDetailsResponse>>;
