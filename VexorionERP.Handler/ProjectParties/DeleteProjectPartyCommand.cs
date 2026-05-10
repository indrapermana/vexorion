using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record DeleteProjectPartyCommand(Guid ProjectId, Guid ProjectPartyId) : IRequest<ServiceResult<bool>>;
