using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProjectAssignmentCommand(Guid ProjectId, Guid AssignmentId) : IRequest<ServiceResult<bool>>;
