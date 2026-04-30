using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetBalanceSheetQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetBalanceSheetQuery, ServiceResult<BalanceSheetReportResponse>>
{
    public async ValueTask<ServiceResult<BalanceSheetReportResponse>> Handle(GetBalanceSheetQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        var result = await reportingService.GetBalanceSheetAsync(request.AsOfDate, cancellationToken);

        if (!result.Succeeded)
            return result;

        var response = result.Value!;

        if (request.PriorAsOfDate.HasValue)
        {
            var priorResult = await reportingService.GetBalanceSheetAsync(request.PriorAsOfDate.Value, cancellationToken);
            if (priorResult.Succeeded)
            {
                response.PriorPeriod = new PriorBalanceSheetSummaryResponse
                {
                    AsOfDate = priorResult.Value!.AsOfDate,
                    TotalAssets = priorResult.Value.TotalAssets,
                    TotalLiabilities = priorResult.Value.TotalLiabilities,
                    TotalEquity = priorResult.Value.TotalEquity,
                    CurrentEarnings = priorResult.Value.CurrentEarnings,
                    TotalLiabilitiesAndEquity = priorResult.Value.TotalLiabilitiesAndEquity,
                };
            }
        }

        return result;
    }
}
