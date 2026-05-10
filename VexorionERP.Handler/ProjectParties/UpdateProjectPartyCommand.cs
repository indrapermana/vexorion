using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateProjectPartyCommand(Guid ProjectId, Guid ProjectPartyId, UpdateProjectPartyRequest Request) : IRequest<ServiceResult<ProjectPartyDetailsResponse>>;
