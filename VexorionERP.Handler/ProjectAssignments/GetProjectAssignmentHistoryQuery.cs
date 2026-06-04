using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectAssignmentHistoryQuery(Guid ProjectId)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>>;
