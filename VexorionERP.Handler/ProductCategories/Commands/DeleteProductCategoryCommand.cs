using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProductCategoryCommand(Guid CategoryId) : IRequest<ServiceResult<bool>>;
