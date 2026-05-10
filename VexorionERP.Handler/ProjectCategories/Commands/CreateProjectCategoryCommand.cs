using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateProjectCategoryCommand(CreateProjectCategoryRequest Request) : IRequest<ServiceResult<ProjectCategoryDetailsResponse>>;
