using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectPartiesQuery(Guid ProjectId) : IRequest<ServiceResult<IReadOnlyCollection<ProjectPartyListItemResponse>>>;
