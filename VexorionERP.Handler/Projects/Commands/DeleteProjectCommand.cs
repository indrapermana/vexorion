using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProjectCommand(Guid ProjectId) : IRequest<ServiceResult<bool>>;
