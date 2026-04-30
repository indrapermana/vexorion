using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProfitAndLossQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProfitAndLossQuery, ServiceResult<ProfitAndLossReportResponse>>
{
    public async ValueTask<ServiceResult<ProfitAndLossReportResponse>> Handle(GetProfitAndLossQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        var result = await reportingService.GetProfitAndLossAsync(request.StartDate, request.EndDate, cancellationToken);

        if (!result.Succeeded)
            return result;

        var response = result.Value!;

        if (request.PriorStartDate.HasValue && request.PriorEndDate.HasValue)
        {
            var priorResult = await reportingService.GetProfitAndLossAsync(request.PriorStartDate.Value, request.PriorEndDate.Value, cancellationToken);
            if (priorResult.Succeeded)
            {
                response.PriorPeriod = new PriorPeriodSummaryResponse
                {
                    PeriodStartDate = priorResult.Value!.PeriodStartDate,
                    PeriodEndDate = priorResult.Value.PeriodEndDate,
                    TotalRevenue = priorResult.Value.TotalRevenue,
                    TotalExpenses = priorResult.Value.TotalExpenses,
                    NetIncome = priorResult.Value.NetIncome,
                };
            }
        }

        return result;
    }
}
