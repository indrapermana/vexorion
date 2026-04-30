using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetApAgingQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetApAgingQuery, ServiceResult<ApAgingReportResponse>>
{
    public async ValueTask<ServiceResult<ApAgingReportResponse>> Handle(GetApAgingQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        return await reportingService.GetApAgingAsync(request.AsOfDate, cancellationToken);
    }
}
