using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProjectPartyByIdQuery(Guid ProjectId, Guid ProjectPartyId) : IRequest<ServiceResult<ProjectPartyDetailsResponse>>;
