using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTenantTelemetryQuery(DateTime? FromUtc, DateTime? ToUtc) : IRequest<ServiceResult<TenantTelemetryResponse>>;
