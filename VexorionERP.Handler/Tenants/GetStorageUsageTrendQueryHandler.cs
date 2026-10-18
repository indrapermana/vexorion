using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetStorageUsageTrendQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetStorageUsageTrendQuery, ServiceResult<StorageUsageTrendResponse>>
{
    public async ValueTask<ServiceResult<StorageUsageTrendResponse>> Handle(
        GetStorageUsageTrendQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var todayUtc = DateTime.UtcNow.Date;
        var fromUtc = todayUtc.AddDays(-(request.DaysBack - 1));
        var endExclusiveUtc = todayUtc.AddDays(1);

        var baseline = await dbContext.StorageUsageLedgers
            .AsNoTracking()
            .Where(l => l.TenantId == request.TenantId && l.OccurredAtUtc < fromUtc)
            .OrderByDescending(l => l.OccurredAtUtc)
            .ThenByDescending(l => l.Id)
            .Select(l => (long?)l.ResultingUsedBytes)
            .FirstOrDefaultAsync(cancellationToken);

        var dailyLatestTimes = dbContext.StorageUsageLedgers
            .AsNoTracking()
            .Where(l =>
                l.TenantId == request.TenantId
                && l.OccurredAtUtc >= fromUtc
                && l.OccurredAtUtc < endExclusiveUtc)
            .GroupBy(l => l.OccurredAtUtc.Date)
            .Select(group => new
            {
                Date = group.Key,
                OccurredAtUtc = group.Max(l => l.OccurredAtUtc)
            });

        var dailyEntries = await (
                from ledger in dbContext.StorageUsageLedgers.AsNoTracking()
                join latest in dailyLatestTimes
                    on new { Date = ledger.OccurredAtUtc.Date, ledger.OccurredAtUtc }
                    equals new { latest.Date, latest.OccurredAtUtc }
                where ledger.TenantId == request.TenantId
                select new
                {
                    ledger.Id,
                    Date = ledger.OccurredAtUtc.Date,
                    UsedBytes = ledger.ResultingUsedBytes,
                    ledger.OperationType
                })
            .OrderBy(entry => entry.Date)
            .ThenByDescending(entry => entry.Id)
            .ToListAsync(cancellationToken);

        // Equal timestamps are possible, so use the stable Id tie-breaker after the
        // database has reduced the result to only the latest timestamp per UTC day.
        var latestByDay = dailyEntries
            .GroupBy(entry => entry.Date)
            .ToDictionary(group => group.Key, group => group.First());

        var usedBytes = baseline ?? 0;
        var points = new List<StorageUsageTrendPoint>(request.DaysBack);
        for (var date = fromUtc; date <= todayUtc; date = date.AddDays(1))
        {
            string? operationType = null;
            if (latestByDay.TryGetValue(date, out var entry))
            {
                usedBytes = entry.UsedBytes;
                operationType = entry.OperationType;
            }

            points.Add(new StorageUsageTrendPoint
            {
                Date = date,
                UsedBytes = usedBytes,
                OperationType = operationType
            });
        }

        return ServiceResult<StorageUsageTrendResponse>.Success(new StorageUsageTrendResponse
        {
            TenantId = request.TenantId,
            Granularity = "day",
            FromUtc = fromUtc,
            ToUtc = todayUtc,
            Points = points
        });
    }
}
