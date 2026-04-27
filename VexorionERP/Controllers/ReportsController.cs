using System.Text;
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
    [HttpGet("profit-and-loss")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<ProfitAndLossReportResponse>> GetProfitAndLoss(
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] DateOnly? priorStartDate,
        [FromQuery] DateOnly? priorEndDate)
    {
        var effectiveEndDate = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStartDate = startDate ?? new DateOnly(effectiveEndDate.Year, effectiveEndDate.Month, 1);
        var result = await reportingService.GetProfitAndLossAsync(effectiveStartDate, effectiveEndDate, HttpContext.RequestAborted);

        if (!result.Succeeded)
        {
            var errorResult = ToActionResult(result);
            return errorResult.Result ?? BadRequest();
        }

        var response = result.Value!;

        if (priorStartDate.HasValue && priorEndDate.HasValue)
        {
            var priorResult = await reportingService.GetProfitAndLossAsync(priorStartDate.Value, priorEndDate.Value, HttpContext.RequestAborted);
            if (priorResult.Succeeded)
            {
                response.PriorPeriod = new PriorPeriodSummaryResponse
                {
                    PeriodStartDate = priorResult.Value!.PeriodStartDate,
                    PeriodEndDate = priorResult.Value.PeriodEndDate,
                    TotalRevenue = priorResult.Value.TotalRevenue,
                    TotalExpenses = priorResult.Value.TotalExpenses,
                    NetIncome = priorResult.Value.NetIncome,
                };
            }
        }

        return Ok(response);
    }

    [HttpGet("profit-and-loss/export")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<IActionResult> ExportProfitAndLoss([FromQuery] DateOnly? startDate, [FromQuery] DateOnly? endDate)
    {
        var effectiveEndDate = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var effectiveStartDate = startDate ?? new DateOnly(effectiveEndDate.Year, effectiveEndDate.Month, 1);
        var result = await reportingService.GetProfitAndLossAsync(effectiveStartDate, effectiveEndDate, HttpContext.RequestAborted);

        if (!result.Succeeded)
        {
            var errorResult = ToActionResult(result);
            return errorResult.Result ?? BadRequest();
        }

        var r = result.Value!;
        var sb = new StringBuilder();
        sb.AppendLine("Section,Account Code,Account Name,Amount");
        foreach (var line in r.RevenueLines)
            sb.AppendLine($"Revenue,{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.Amount}");
        sb.AppendLine($"Revenue Total,,,{r.TotalRevenue}");
        foreach (var line in r.ExpenseLines)
            sb.AppendLine($"Expense,{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.Amount}");
        sb.AppendLine($"Expense Total,,,{r.TotalExpenses}");
        sb.AppendLine($"Net Income,,,{r.NetIncome}");

        var fileName = $"profit-and-loss-{effectiveStartDate:yyyy-MM-dd}-to-{effectiveEndDate:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    [HttpGet("balance-sheet")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<BalanceSheetReportResponse>> GetBalanceSheet([FromQuery] DateOnly? asOfDate, [FromQuery] DateOnly? priorAsOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetBalanceSheetAsync(effectiveDate, HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        var response = result.Value!;
        if (priorAsOfDate.HasValue)
        {
            var priorResult = await reportingService.GetBalanceSheetAsync(priorAsOfDate.Value, HttpContext.RequestAborted);
            if (priorResult.Succeeded)
            {
                response.PriorPeriod = new PriorBalanceSheetSummaryResponse
                {
                    AsOfDate = priorResult.Value!.AsOfDate,
                    TotalAssets = priorResult.Value.TotalAssets,
                    TotalLiabilities = priorResult.Value.TotalLiabilities,
                    TotalEquity = priorResult.Value.TotalEquity,
                    CurrentEarnings = priorResult.Value.CurrentEarnings,
                    TotalLiabilitiesAndEquity = priorResult.Value.TotalLiabilitiesAndEquity,
                };
            }
        }

        return Ok(response);
    }

    [HttpGet("balance-sheet/export")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<IActionResult> ExportBalanceSheet([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetBalanceSheetAsync(effectiveDate, HttpContext.RequestAborted);

        if (!result.Succeeded)
        {
            var errorResult = ToActionResult(result);
            return errorResult.Result ?? BadRequest();
        }

        var r = result.Value!;
        var sb = new StringBuilder();
        sb.AppendLine("Section,Account Code,Account Name,Amount");
        foreach (var line in r.AssetLines)
            sb.AppendLine($"Asset,{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.Amount}");
        sb.AppendLine($"Total Assets,,,{r.TotalAssets}");
        foreach (var line in r.LiabilityLines)
            sb.AppendLine($"Liability,{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.Amount}");
        sb.AppendLine($"Total Liabilities,,,{r.TotalLiabilities}");
        foreach (var line in r.EquityLines)
            sb.AppendLine($"Equity,{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.Amount}");
        sb.AppendLine($"Current Earnings,,,{r.CurrentEarnings}");
        sb.AppendLine($"Total Equity & Liabilities,,,{r.TotalLiabilitiesAndEquity}");

        var fileName = $"balance-sheet-{effectiveDate:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    [HttpGet("dashboard")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<FinanceDashboardSnapshotResponse>> GetDashboardSnapshot([FromQuery] DateOnly? asOfDate, [FromQuery] int periodDays = 30)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetFinanceDashboardSnapshotAsync(effectiveDate, periodDays, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("ar-aging")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<ArAgingReportResponse>> GetArAging([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetArAgingAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("ap-aging")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<ApAgingReportResponse>> GetApAging([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetApAgingAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("trial-balance")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<TrialBalanceReportResponse>> GetTrialBalance([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetTrialBalanceAsync(effectiveDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("trial-balance/export")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<IActionResult> ExportTrialBalance([FromQuery] DateOnly? asOfDate)
    {
        var effectiveDate = asOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetTrialBalanceAsync(effectiveDate, HttpContext.RequestAborted);

        if (!result.Succeeded)
        {
            var errorResult = ToActionResult(result);
            return errorResult.Result ?? BadRequest();
        }

        var r = result.Value!;
        var sb = new StringBuilder();
        sb.AppendLine("Account Code,Account Name,Total Debit,Total Credit,Ending Debit,Ending Credit");
        foreach (var line in r.Lines)
            sb.AppendLine($"{CsvEscape(line.AccountCode)},{CsvEscape(line.AccountName)},{line.TotalDebit},{line.TotalCredit},{line.EndingDebit},{line.EndingCredit}");
        sb.AppendLine($"TOTAL,,{r.TotalDebit},{r.TotalCredit},{r.EndingDebitTotal},{r.EndingCreditTotal}");

        var fileName = $"trial-balance-{effectiveDate:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    [HttpGet("account-drill-down/{accountId:guid}")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<ActionResult<AccountDrillDownResponse>> GetAccountDrillDown(
        Guid accountId,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate)
    {
        var effectiveEndDate = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetAccountDrillDownAsync(accountId, startDate, effectiveEndDate, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("account-drill-down/{accountId:guid}/export")]
    [Authorize(Policy = AppPermissions.Reports.View)]
    public async Task<IActionResult> ExportAccountDrillDown(
        Guid accountId,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate)
    {
        var effectiveEndDate = endDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await reportingService.GetAccountDrillDownAsync(accountId, startDate, effectiveEndDate, HttpContext.RequestAborted);

        if (!result.Succeeded)
        {
            var errorResult = ToActionResult(result);
            return errorResult.Result ?? BadRequest();
        }

        var r = result.Value!;
        var sb = new StringBuilder();
        sb.AppendLine("Posting Date,Journal Number,Description,Debit,Credit");
        foreach (var line in r.Lines)
            sb.AppendLine($"{line.PostingDate:yyyy-MM-dd},{CsvEscape(line.JournalNumber)},{CsvEscape(line.Description)},{line.DebitAmount},{line.CreditAmount}");
        sb.AppendLine($"TOTAL,,,{r.TotalDebit},{r.TotalCredit}");

        var fileName = $"account-drill-down-{r.AccountCode}-{effectiveEndDate:yyyy-MM-dd}.csv";
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}

