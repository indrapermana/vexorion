using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetTenantTelemetryQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetTenantTelemetryQuery, ServiceResult<TenantTelemetryResponse>>
{
    public async ValueTask<ServiceResult<TenantTelemetryResponse>> Handle(GetTenantTelemetryQuery request, CancellationToken cancellationToken)
    {
        if (request.FromUtc.HasValue && request.ToUtc.HasValue && request.FromUtc.Value > request.ToUtc.Value)
        {
            return ServiceResult<TenantTelemetryResponse>.Failure(400, "fromUtc must be earlier than or equal to toUtc.");
        }

        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var tenantIds = await dbContext.Tenants
            .AsNoTracking()
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        var loginQuery = dbContext.AuditLogs
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(x => x.EventType == "auth.login");

        if (request.FromUtc.HasValue)
        {
            var fromUtc = request.FromUtc.Value;
            loginQuery = loginQuery.Where(x => x.CreatedAtUtc >= fromUtc);
        }

        if (request.ToUtc.HasValue)
        {
            var toUtc = request.ToUtc.Value;
            loginQuery = loginQuery.Where(x => x.CreatedAtUtc <= toUtc);
        }

        var loginCounts = await loginQuery
            .GroupBy(x => x.TenantId)
            .Select(group => new
            {
                TenantId = group.Key,
                Count = group.Count(),
            })
            .ToDictionaryAsync(x => x.TenantId, x => x.Count, cancellationToken);

        var pageVisitsQuery = dbContext.TenantPageVisits
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (request.FromUtc.HasValue)
        {
            var fromDate = DateOnly.FromDateTime(request.FromUtc.Value.ToUniversalTime().Date);
            pageVisitsQuery = pageVisitsQuery.Where(x => x.VisitDate >= fromDate);
        }

        if (request.ToUtc.HasValue)
        {
            var toDate = DateOnly.FromDateTime(request.ToUtc.Value.ToUniversalTime().Date);
            pageVisitsQuery = pageVisitsQuery.Where(x => x.VisitDate <= toDate);
        }

        var aggregatedPageVisits = await pageVisitsQuery
            .GroupBy(x => new { x.TenantId, x.Path })
            .Select(group => new
            {
                group.Key.TenantId,
                group.Key.Path,
                VisitCount = group.Sum(x => x.VisitCount),
            })
            .ToListAsync(cancellationToken);

        var mostVisitedMap = aggregatedPageVisits
            .GroupBy(x => x.TenantId)
            .Select(group => group.OrderByDescending(x => x.VisitCount).ThenBy(x => x.Path).First())
            .ToDictionary(x => x.TenantId, x => (x.Path, x.VisitCount));

        var items = tenantIds.Select(tenantId =>
        {
            var hasMostVisited = mostVisitedMap.TryGetValue(tenantId, out var mostVisited);
            return new TenantTelemetryListItemResponse
            {
                TenantId = tenantId,
                LoginCount = loginCounts.GetValueOrDefault(tenantId),
                MostVisitedPage = hasMostVisited ? mostVisited.Path : null,
                MostVisitedPageVisits = hasMostVisited ? mostVisited.VisitCount : 0,
            };
        }).ToArray();

        return ServiceResult<TenantTelemetryResponse>.Success(new TenantTelemetryResponse
        {
            Tenants = items,
        });
    }
}
