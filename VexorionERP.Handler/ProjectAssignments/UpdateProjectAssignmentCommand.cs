using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProjectAssignmentCommand(Guid ProjectId, Guid AssignmentId, UpdateProjectAssignmentRequest Request)
    : IRequest<ServiceResult<ProjectAssignmentDetailsResponse>>;
