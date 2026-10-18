using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class StorageAccountingService : IStorageAccountingService
{
    public async Task<ServiceResult<bool>> CheckQuotaAsync(
        Guid tenantId,
        long incomingFileSizeBytes,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        // Get active plan for tenant
        var plan = await dbContext.TenantPlans
            .GetByTenant(tenantId)
            .Where(x => x.EffectiveFromUtc <= DateTime.UtcNow && (x.EffectiveToUtc == null || x.EffectiveToUtc > DateTime.UtcNow))
            .OrderByDescending(x => x.EffectiveFromUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (plan is null)
        {
            // No plan configured — allow by default (no enforcement without a plan)
            return ServiceResult<bool>.Success(true);
        }

        if (incomingFileSizeBytes > plan.MaxFileSizeBytes)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status413PayloadTooLarge,
                $"The file exceeds the maximum allowed file size of {FormatBytes(plan.MaxFileSizeBytes)}.");
        }

        var summary = await dbContext.StorageUsageSummaries
            .GetByTenant(tenantId)
            .FirstOrDefaultAsync(cancellationToken);

        var currentUsedBytes = summary?.UsedBytes ?? 0;
        var projectedUsage = currentUsedBytes + incomingFileSizeBytes;

        if (projectedUsage > plan.MaxStorageBytes)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status507InsufficientStorage,
                $"Uploading this file would exceed your storage quota of {FormatBytes(plan.MaxStorageBytes)}.");
        }

        return ServiceResult<bool>.Success(true);
    }

    public async Task RecordLedgerEntryAsync(
        Guid tenantId,
        long deltaBytes,
        string operationType,
        Guid? projectId,
        Guid? projectDocumentId,
        Guid? performedByUserId,
        string? reference,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var summary = await dbContext.StorageUsageSummaries
            .GetByTenant(tenantId)
            .FirstOrDefaultAsync(cancellationToken);

        var newUsedBytes = (summary?.UsedBytes ?? 0) + deltaBytes;
        if (newUsedBytes < 0) newUsedBytes = 0;

        if (summary is null)
        {
            summary = new StorageUsageSummary
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                UsedBytes = newUsedBytes,
                ReservedBytes = 0,
                LastCalculatedAtUtc = DateTime.UtcNow
            };
            dbContext.StorageUsageSummaries.Add(summary);
        }
        else
        {
            summary.UsedBytes = newUsedBytes;
            summary.LastCalculatedAtUtc = DateTime.UtcNow;
        }

        var ledgerEntry = new StorageUsageLedger
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ProjectId = projectId,
            ProjectDocumentId = projectDocumentId,
            OperationType = operationType,
            DeltaBytes = deltaBytes,
            ResultingUsedBytes = newUsedBytes,
            PerformedByUserId = performedByUserId,
            OccurredAtUtc = DateTime.UtcNow,
            Reference = reference
        };
        dbContext.StorageUsageLedgers.Add(ledgerEntry);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string FormatBytes(long bytes)
    {
        string[] units = ["bytes", "KB", "MB", "GB", "TB"];
        var unitIndex = 0;
        var value = (decimal)bytes;

        while (value >= 1024 && unitIndex < units.Length - 1)
        {
            value /= 1024;
            unitIndex++;
        }

        var formattedValue = unitIndex == 0
            ? value.ToString("0")
            : value.ToString("0.##");

        return $"{formattedValue} {units[unitIndex]}";
    }
}
