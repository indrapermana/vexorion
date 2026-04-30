using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetArAgingQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetArAgingQuery, ServiceResult<ArAgingReportResponse>>
{
    public async ValueTask<ServiceResult<ArAgingReportResponse>> Handle(GetArAgingQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        return await reportingService.GetArAgingAsync(request.AsOfDate, cancellationToken);
    }
}
