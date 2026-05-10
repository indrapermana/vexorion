using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProjectCommand(Guid ProjectId, UpdateProjectRequest Request) : IRequest<ServiceResult<ProjectDetailsResponse>>;
