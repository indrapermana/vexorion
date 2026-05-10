using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProjectCommand(CreateProjectRequest Request) : IRequest<ServiceResult<ProjectDetailsResponse>>;
