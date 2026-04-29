using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetFiscalPeriodByIdQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetFiscalPeriodByIdQuery, ServiceResult<FiscalPeriodDetailsResponse>>
{
    public async ValueTask<ServiceResult<FiscalPeriodDetailsResponse>> Handle(GetFiscalPeriodByIdQuery request, CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
            return ServiceResult<FiscalPeriodDetailsResponse>.Failure(400, "Tenant context is required.");

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantId = tenantProvider.TenantId.Value;

        var period = await dbContext.FiscalPeriods
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.Id == request.FiscalPeriodId)
            .Select(x => new FiscalPeriodDetailsResponse
            {
                Id = x.Id,
                PeriodCode = x.PeriodCode,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsClosed = x.IsClosed,
                ClosedAtUtc = x.ClosedAtUtc,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (period is null)
            return ServiceResult<FiscalPeriodDetailsResponse>.Failure(404, "Fiscal period not found.");

        return ServiceResult<FiscalPeriodDetailsResponse>.Success(period);
    }
}
