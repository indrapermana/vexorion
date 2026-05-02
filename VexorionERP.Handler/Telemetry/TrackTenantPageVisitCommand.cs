using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record TrackTenantPageVisitCommand(TrackPageVisitRequest Request) : IRequest<ServiceResult<bool>>;
