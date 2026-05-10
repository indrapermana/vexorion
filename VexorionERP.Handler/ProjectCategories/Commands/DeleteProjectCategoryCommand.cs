using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProjectCategoryCommand(Guid CategoryId) : IRequest<ServiceResult<bool>>;
