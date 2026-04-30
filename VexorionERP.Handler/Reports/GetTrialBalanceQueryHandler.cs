using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTrialBalanceQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTrialBalanceQuery, ServiceResult<TrialBalanceReportResponse>>
{
    public async ValueTask<ServiceResult<TrialBalanceReportResponse>> Handle(GetTrialBalanceQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        return await reportingService.GetTrialBalanceAsync(request.AsOfDate, cancellationToken);
    }
}
