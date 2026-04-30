using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetDashboardSnapshotQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetDashboardSnapshotQuery, ServiceResult<FinanceDashboardSnapshotResponse>>
{
    public async ValueTask<ServiceResult<FinanceDashboardSnapshotResponse>> Handle(GetDashboardSnapshotQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        return await reportingService.GetFinanceDashboardSnapshotAsync(request.AsOfDate, request.PeriodDays, cancellationToken);
    }
}
