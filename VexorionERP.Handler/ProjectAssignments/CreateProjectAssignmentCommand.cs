using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProjectAssignmentCommand(Guid ProjectId, CreateProjectAssignmentRequest Request)
    : IRequest<ServiceResult<ProjectAssignmentDetailsResponse>>;
