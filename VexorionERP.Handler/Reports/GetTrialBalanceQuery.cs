using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTrialBalanceQuery(DateOnly AsOfDate) : IRequest<ServiceResult<TrialBalanceReportResponse>>;
