using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetFiscalPeriodsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetFiscalPeriodsQuery, ServiceResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>> Handle(GetFiscalPeriodsQuery request, CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
            return ServiceResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>.Failure(400, "Tenant context is required.");

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = tenantProvider.TenantId.Value;

        var periods = await dbContext.FiscalPeriods
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.StartDate)
            .Select(x => new FiscalPeriodListItemResponse
            {
                Id = x.Id,
                PeriodCode = x.PeriodCode,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsClosed = x.IsClosed,
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>.Success(periods);
    }
}
