using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetBalanceSheetQuery(
    DateOnly AsOfDate,
    DateOnly? PriorAsOfDate = null) : IRequest<ServiceResult<BalanceSheetReportResponse>>;
