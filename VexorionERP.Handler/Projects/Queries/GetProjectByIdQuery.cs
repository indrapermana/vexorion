using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectByIdQuery(Guid ProjectId) : IRequest<ServiceResult<ProjectDetailsResponse>>;
