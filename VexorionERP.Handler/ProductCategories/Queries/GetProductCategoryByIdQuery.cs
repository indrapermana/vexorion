using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProductCategoryByIdQuery(Guid CategoryId) : IRequest<ServiceResult<ProductCategoryDetailsResponse>>;
