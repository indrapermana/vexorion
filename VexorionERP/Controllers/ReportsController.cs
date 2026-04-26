using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Finance.Reporting;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(
    IReportingService reportingService) : ServiceResultControllerBase
{
    [HttpGet("dashboard")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<FinanceDashboardSnapshotResponse>> GetDashboardSnapshot([FromQuery] DateOnly? asOfDate, [FromQuery] int periodDays = 30)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetFinanceDashboardSnapshotAsync(effectiveDate, periodDays, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("ar-aging")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<ArAgingReportResponse>> GetArAging([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetArAgingAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("ap-aging")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<ApAgingReportResponse>> GetApAging([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetApAgingAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("trial-balance")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<TrialBalanceReportResponse>> GetTrialBalance([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetTrialBalanceAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
