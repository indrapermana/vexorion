using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tenants/{tenantId:guid}/storage")]
[Authorize]
public class TenantStorageController(IMediator mediator, AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet("summary")]
    [Authorize(Policy = AppPermissions.StorageUsage.View)]
    public async Task<ActionResult<StorageUsageSummaryResponse>> GetSummary(Guid tenantId)
    {
        var result = await mediator.Send(new GetStorageUsageSummaryQuery(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("trend")]
    [Authorize(Policy = AppPermissions.StorageUsage.View)]
    public async Task<ActionResult<StorageUsageTrendResponse>> GetTrend(Guid tenantId, [FromQuery] int daysBack = 30)
    {
        if (daysBack is < 1 or > 365)
        {
            return ApiFailure(StatusCodes.Status400BadRequest, "daysBack must be between 1 and 365.", "storage.days_back_invalid");
        }

        var result = await mediator.Send(new GetStorageUsageTrendQuery(tenantId, daysBack), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("top-consumers")]
    [Authorize(Policy = AppPermissions.StorageUsage.View)]
    public async Task<ActionResult<StorageTopConsumersResponse>> GetTopConsumers(Guid tenantId, [FromQuery] int take = 10)
    {
        if (take is < 1 or > 100)
        {
            return ApiFailure(StatusCodes.Status400BadRequest, "take must be between 1 and 100.", "storage.take_invalid");
        }

        var result = await mediator.Send(new GetStorageTopConsumersQuery(tenantId, take), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("export")]
    [Authorize(Policy = AppPermissions.StorageUsage.View)]
    public async Task<IActionResult> ExportUsageReport(
        Guid tenantId,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate)
    {
        var effectiveEndDate = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStartDate = startDate ?? effectiveEndDate.AddDays(-30);

        if (effectiveStartDate > effectiveEndDate)
        {
            return ApiFailure(StatusCodes.Status400BadRequest, "startDate must be less than or equal to endDate.", "storage.date_range_invalid");
        }

        var startUtc = effectiveStartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endExclusiveUtc = effectiveEndDate.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        var entries = await dbContext.StorageUsageLedgers
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.OccurredAtUtc >= startUtc && x.OccurredAtUtc < endExclusiveUtc)
            .OrderBy(x => x.OccurredAtUtc)
            .ToListAsync(HttpContext.RequestAborted);

        var sb = new StringBuilder();
        sb.AppendLine("OccurredAtUtc,OperationType,DeltaBytes,ResultingUsedBytes,ProjectId,ProjectDocumentId,Reference");
        foreach (var entry in entries)
        {
            sb.AppendLine($"{entry.OccurredAtUtc:O},{CsvEscape(entry.OperationType)},{entry.DeltaBytes},{entry.ResultingUsedBytes},{entry.ProjectId},{entry.ProjectDocumentId},{CsvEscape(entry.Reference ?? string.Empty)}");
        }

        var totalDelta = entries.Sum(x => x.DeltaBytes);
        var latestUsage = entries.LastOrDefault()?.ResultingUsedBytes ?? 0;
        sb.AppendLine($"SUMMARY,TOTAL,{totalDelta},{latestUsage},,,");

        var fileName = $"storage-usage-{effectiveStartDate:yyyy-MM-dd}-to-{effectiveEndDate:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
