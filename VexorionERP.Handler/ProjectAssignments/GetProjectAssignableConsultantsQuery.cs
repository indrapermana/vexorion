using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectAssignableConsultantsQuery(Guid ProjectId)
    : IRequest<ServiceResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>>;