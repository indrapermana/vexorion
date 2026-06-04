using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetStorageUsageSummaryQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetStorageUsageSummaryQuery, ServiceResult<StorageUsageSummaryResponse>>
{
    public async ValueTask<ServiceResult<StorageUsageSummaryResponse>> Handle(
        GetStorageUsageSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var summary = await dbContext.StorageUsageSummaries
            .AsNoTracking()
            .Where(s => s.TenantId == request.TenantId)
            .FirstOrDefaultAsync(cancellationToken);

        var plan = await dbContext.TenantPlans
            .AsNoTracking()
            .Where(p => p.TenantId == request.TenantId
                && p.EffectiveFromUtc <= now
                && (p.EffectiveToUtc == null || p.EffectiveToUtc > now))
            .OrderByDescending(p => p.EffectiveFromUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var usedBytes = summary?.UsedBytes ?? 0;
        var maxBytes = plan?.MaxStorageBytes ?? 0;

        int usedPercent = maxBytes > 0 ? (int)((usedBytes * 100L) / maxBytes) : 0;

        var thresholdStatus = StorageThresholdStatus.Normal;
        if (plan is not null)
        {
            if (usedPercent >= plan.HardBlockThresholdPercent)
                thresholdStatus = StorageThresholdStatus.HardBlock;
            else if (usedPercent >= plan.SoftBlockThresholdPercent)
                thresholdStatus = StorageThresholdStatus.SoftBlock;
            else if (usedPercent >= plan.WarningThresholdPercent)
                thresholdStatus = StorageThresholdStatus.Warning;
        }

        return ServiceResult<StorageUsageSummaryResponse>.Success(new StorageUsageSummaryResponse
        {
            TenantId = request.TenantId,
            UsedBytes = usedBytes,
            ReservedBytes = summary?.ReservedBytes ?? 0,
            MaxStorageBytes = maxBytes,
            UsedPercent = usedPercent,
            ThresholdStatus = thresholdStatus,
            LastCalculatedAtUtc = summary?.LastCalculatedAtUtc ?? now,
            PlanCode = plan?.PlanCode,
            PlanName = plan?.PlanName
        });
    }
}
