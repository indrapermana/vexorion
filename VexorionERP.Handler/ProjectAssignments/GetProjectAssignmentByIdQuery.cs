using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectAssignmentByIdQuery(Guid ProjectId, Guid AssignmentId)
    : IRequest<ServiceResult<ProjectAssignmentDetailsResponse>>;
