using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectAssignmentsQuery(Guid ProjectId)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>>;
