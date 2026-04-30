using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetProfitAndLossQuery(
    DateOnly StartDate,
    DateOnly EndDate,
    DateOnly? PriorStartDate = null,
    DateOnly? PriorEndDate = null) : IRequest<ServiceResult<ProfitAndLossReportResponse>>;
