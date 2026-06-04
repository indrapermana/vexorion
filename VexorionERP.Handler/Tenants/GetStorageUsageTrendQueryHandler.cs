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

        var cutoff = DateTime.UtcNow.AddDays(-request.DaysBack);

        var entries = await dbContext.StorageUsageLedgers
            .AsNoTracking()
            .Where(l => l.TenantId == request.TenantId && l.OccurredAtUtc >= cutoff)
            .OrderBy(l => l.OccurredAtUtc)
            .Select(l => new StorageUsageTrendPoint
            {
                Date = l.OccurredAtUtc,
                UsedBytes = l.ResultingUsedBytes,
                OperationType = l.OperationType
            })
            .ToListAsync(cancellationToken);

        return ServiceResult<StorageUsageTrendResponse>.Success(new StorageUsageTrendResponse
        {
            TenantId = request.TenantId,
            Points = entries
        });
    }
}
