using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetDashboardSnapshotQuery(DateOnly AsOfDate, int PeriodDays) : IRequest<ServiceResult<FinanceDashboardSnapshotResponse>>;
