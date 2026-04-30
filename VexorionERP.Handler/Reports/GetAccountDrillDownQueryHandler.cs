using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetAccountDrillDownQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetAccountDrillDownQuery, ServiceResult<AccountDrillDownResponse>>
{
    public async ValueTask<ServiceResult<AccountDrillDownResponse>> Handle(GetAccountDrillDownQuery request, CancellationToken cancellationToken)
    {
        var reportingService = serviceProvider.GetRequiredService<IReportingService>();
        return await reportingService.GetAccountDrillDownAsync(request.AccountId, request.StartDate, request.EndDate, cancellationToken);
    }
}
