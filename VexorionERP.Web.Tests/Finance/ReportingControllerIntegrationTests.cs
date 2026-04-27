using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts.Finance.Reporting;
using VexorionERP.Database;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Identity;
using VexorionERP.Web.Tests.Support;
using Xunit;

namespace VexorionERP.Web.Tests.Finance;

public class ReportingControllerIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReportingControllerIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reports_ArAging_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/ar-aging?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ArAgingReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Items);
    }

    [Fact]
    public async Task Reports_ApAging_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/ap-aging?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ApAgingReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Items);
    }

    [Fact]
    public async Task Reports_TrialBalance_EmptyState_ReturnsReportEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/trial-balance?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<TrialBalanceReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.Lines);
    }

    [Fact]
    public async Task Reports_Dashboard_EmptyState_ReturnsSnapshotEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/dashboard?asOfDate=2026-04-30&periodDays=30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<FinanceDashboardSnapshotResponse>();
        Assert.NotNull(payload);
        Assert.Equal(0m, payload.ReceivablesOpen);
        Assert.Equal(0m, payload.PayablesOpen);
    }

    [Fact]
    public async Task Reports_ProfitAndLoss_EmptyState_ReturnsEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/profit-and-loss?startDate=2026-04-01&endDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProfitAndLossReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.RevenueLines);
        Assert.Empty(payload.ExpenseLines);
    }

    [Fact]
    public async Task Reports_BalanceSheet_EmptyState_ReturnsEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<BalanceSheetReportResponse>();
        Assert.NotNull(payload);
        Assert.Empty(payload.AssetLines);
        Assert.Empty(payload.LiabilityLines);
        Assert.Empty(payload.EquityLines);
    }

    [Fact]
    public async Task Reports_ProfitAndLoss_Export_ReturnsCsvContentType()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/profit-and-loss/export?startDate=2026-04-01&endDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Section,Account Code,Account Name,Amount", content);
        Assert.Contains("Net Income", content);
    }

    [Fact]
    public async Task Reports_BalanceSheet_Export_ReturnsCsvContentType()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/balance-sheet/export?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Section,Account Code,Account Name,Amount", content);
        Assert.Contains("Total Assets", content);
    }

    [Fact]
    public async Task Reports_TrialBalance_Export_ReturnsCsvContentType()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync("/api/reports/trial-balance/export?asOfDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Account Code,Account Name,Total Debit,Total Credit", content);
    }

    [Fact]
    public async Task Reports_AccountDrillDown_EmptyState_ReturnsEnvelope()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync($"/api/reports/account-drill-down/{Guid.NewGuid()}?startDate=2026-04-01&endDate=2026-04-30");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AccountDrillDown_Export_UnknownAccount_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync($"/api/reports/account-drill-down/{Guid.NewGuid()}/export?startDate=2026-04-01&endDate=2026-04-30");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Reports_AccountDrillDown_WithData_ReturnsJournalLines()
    {
        await using var seededFactory = new ReportingSeededWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var assetAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var journalId = Guid.NewGuid();

        using (var scope = seededFactory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            dbContext.FiscalPeriods.Add(new FiscalPeriod
            {
                Id = periodId,
                TenantId = tenantId,
                PeriodCode = "2026-04",
                StartDate = new DateOnly(2026, 4, 1),
                EndDate = new DateOnly(2026, 4, 30),
                IsClosed = false,
            });

            dbContext.Accounts.AddRange(
                new Account
                {
                    Id = assetAccountId,
                    TenantId = tenantId,
                    Code = "1000",
                    Name = "Cash",
                    AccountType = AccountType.Asset,
                    NormalBalance = NormalBalanceType.Debit,
                    IsPostingAllowed = true,
                    IsActive = true,
                },
                new Account
                {
                    Id = revenueAccountId,
                    TenantId = tenantId,
                    Code = "4000",
                    Name = "Revenue",
                    AccountType = AccountType.Revenue,
                    NormalBalance = NormalBalanceType.Credit,
                    IsPostingAllowed = true,
                    IsActive = true,
                });

            dbContext.JournalEntries.Add(new JournalEntry
            {
                Id = journalId,
                TenantId = tenantId,
                JournalNumber = "JRN-DRILL-1",
                SourceDocumentType = "SalesInvoice",
                SourceDocumentId = Guid.NewGuid(),
                PostingDate = new DateOnly(2026, 4, 15),
                FiscalPeriodId = periodId,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 1250m,
                TotalCredit = 1250m,
                Description = "Cash receipt",
            });

            dbContext.JournalEntryLines.AddRange(
                new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    JournalEntryId = journalId,
                    AccountId = assetAccountId,
                    LineNumber = 1,
                    DebitAmount = 1250m,
                    CreditAmount = 0m,
                },
                new JournalEntryLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    JournalEntryId = journalId,
                    AccountId = revenueAccountId,
                    LineNumber = 2,
                    DebitAmount = 0m,
                    CreditAmount = 1250m,
                });

            await dbContext.SaveChangesAsync();
        }

        var client = seededFactory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Reports.View);

        var response = await client.GetAsync($"/api/reports/account-drill-down/{assetAccountId}?startDate=2026-04-01&endDate=2026-04-30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<AccountDrillDownResponse>();
        Assert.NotNull(payload);
        Assert.Equal(assetAccountId, payload.AccountId);
        Assert.Single(payload.Lines);
        Assert.Equal("JRN-DRILL-1", payload.Lines.First().JournalNumber);
        Assert.Equal(1250m, payload.TotalDebit);
        Assert.Equal(0m, payload.TotalCredit);

        var exportResponse = await client.GetAsync($"/api/reports/account-drill-down/{assetAccountId}/export?startDate=2026-04-01&endDate=2026-04-30");
        Assert.Equal(HttpStatusCode.OK, exportResponse.StatusCode);
        Assert.Equal("text/csv", exportResponse.Content.Headers.ContentType?.MediaType);
        var csv = await exportResponse.Content.ReadAsStringAsync();
        Assert.Contains("Posting Date,Journal Number,Description,Debit,Credit", csv);
        Assert.Contains("JRN-DRILL-1", csv);
    }

    private sealed class ReportingSeededWebApplicationFactory : TestWebApplicationFactoryBase
    {
        private readonly string _databaseName = $"vexorion-reporting-seeded-{Guid.NewGuid()}";

        protected override string GetDatabaseName() => _databaseName;
    }

    [Fact]
    public async Task Reports_ProfitAndLoss_WithPriorPeriod_ReturnsPriorSummary()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync(
            "/api/reports/profit-and-loss?startDate=2026-04-01&endDate=2026-04-30&priorStartDate=2026-03-01&priorEndDate=2026-03-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<ProfitAndLossReportResponse>();
        Assert.NotNull(payload);
        // Prior period summary must be populated when prior dates are supplied
        Assert.NotNull(payload.PriorPeriod);
        Assert.Equal(new DateOnly(2026, 3, 1), payload.PriorPeriod.PeriodStartDate);
        Assert.Equal(new DateOnly(2026, 3, 31), payload.PriorPeriod.PeriodEndDate);
    }

    [Fact]
    public async Task Reports_BalanceSheet_WithPriorPeriod_ReturnsPriorSummary()
    {
        var client = _factory.CreateClient();
        client.SetBearerToken(Guid.NewGuid(), AppPermissions.Reports.View);

        var response = await client.GetAsync(
            "/api/reports/balance-sheet?asOfDate=2026-04-30&priorAsOfDate=2026-03-31");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<BalanceSheetReportResponse>();
        Assert.NotNull(payload);
        Assert.NotNull(payload.PriorPeriod);
        Assert.Equal(new DateOnly(2026, 3, 31), payload.PriorPeriod.AsOfDate);
    }
}
