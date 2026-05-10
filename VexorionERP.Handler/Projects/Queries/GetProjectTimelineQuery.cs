using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectTimelineQuery(Guid ProjectId)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectTimelineItemResponse>>>;
