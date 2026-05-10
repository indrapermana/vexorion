using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectCategoryByIdQuery(Guid CategoryId) : IRequest<ServiceResult<ProjectCategoryDetailsResponse>>;
