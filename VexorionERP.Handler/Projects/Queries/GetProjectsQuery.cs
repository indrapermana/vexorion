using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectsQuery(ProjectLifecycleStatus? Status, Guid? RelatedTenantId)
	: IRequest<ServiceResult<IReadOnlyCollection<ProjectListItemResponse>>>;
