using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Web.Tests;
using Xunit;

namespace VexorionERP.Web.Tests;

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

    [Fact]
    public async Task Reports_PopulatedStatements_ReconcileAcrossInclusiveDatesAndTenantBoundaries()
    {
        await using var factory = new ReportingSeededWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var start = new DateOnly(2026, 4, 1);
        var end = new DateOnly(2026, 4, 30);
        var cashId = Guid.NewGuid();
        var equityId = Guid.NewGuid();
        var revenueId = Guid.NewGuid();
        var expenseId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Accounts.AddRange(
                new Account { Id = cashId, TenantId = tenantId, Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit },
                new Account { Id = equityId, TenantId = tenantId, Code = "3000", Name = "Capital", AccountType = AccountType.Equity, NormalBalance = NormalBalanceType.Credit },
                new Account { Id = revenueId, TenantId = tenantId, Code = "4000", Name = "Revenue", AccountType = AccountType.Revenue, NormalBalance = NormalBalanceType.Credit },
                new Account { Id = expenseId, TenantId = tenantId, Code = "5000", Name = "Expense", AccountType = AccountType.Expense, NormalBalance = NormalBalanceType.Debit });

            void AddJournal(Guid owner, DateOnly date, JournalEntryStatus status, Guid debitAccount, Guid creditAccount, decimal amount)
            {
                db.JournalEntries.Add(new JournalEntry
                {
                    Id = Guid.NewGuid(), TenantId = owner, JournalNumber = $"JRN-{Guid.NewGuid():N}",
                    PostingDate = date, Status = status, TotalDebit = amount, TotalCredit = amount,
                    Lines = new List<JournalEntryLine>
                    {
                        new() { Id = Guid.NewGuid(), TenantId = owner, AccountId = debitAccount, LineNumber = 1, DebitAmount = amount },
                        new() { Id = Guid.NewGuid(), TenantId = owner, AccountId = creditAccount, LineNumber = 2, CreditAmount = amount },
                    },
                });
            }

            AddJournal(tenantId, start.AddDays(-1), JournalEntryStatus.Posted, cashId, equityId, 500m);
            AddJournal(tenantId, start, JournalEntryStatus.Posted, cashId, revenueId, 1000m);
            AddJournal(tenantId, end, JournalEntryStatus.Posted, expenseId, cashId, 300m);
            AddJournal(tenantId, end.AddDays(1), JournalEntryStatus.Posted, cashId, revenueId, 9000m);
            AddJournal(tenantId, start, JournalEntryStatus.Draft, cashId, revenueId, 8000m);
            AddJournal(otherTenantId, start, JournalEntryStatus.Posted, cashId, revenueId, 7000m);
            await db.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Reports.View);
        var profit = await client.GetFromJsonAsync<ProfitAndLossReportResponse>("/api/reports/profit-and-loss?startDate=2026-04-01&endDate=2026-04-30&priorStartDate=2026-03-01&priorEndDate=2026-03-31");
        var balance = await client.GetFromJsonAsync<BalanceSheetReportResponse>("/api/reports/balance-sheet?asOfDate=2026-04-30&priorAsOfDate=2026-03-31");
        var trial = await client.GetFromJsonAsync<TrialBalanceReportResponse>("/api/reports/trial-balance?asOfDate=2026-04-30");
        var drill = await client.GetFromJsonAsync<AccountDrillDownResponse>($"/api/reports/account-drill-down/{cashId}?startDate=2026-04-01&endDate=2026-04-30");

        Assert.NotNull(profit);
        Assert.NotNull(balance);
        Assert.NotNull(trial);
        Assert.NotNull(drill);
        Assert.Equal(1000m, profit.TotalRevenue);
        Assert.Equal(300m, profit.TotalExpenses);
        Assert.Equal(700m, profit.NetIncome);
        Assert.Equal(profit.TotalRevenue, Assert.Single(profit.RevenueLines).Amount);
        Assert.Equal(profit.TotalExpenses, Assert.Single(profit.ExpenseLines).Amount);
        Assert.Equal(1200m, balance.TotalAssets);
        Assert.Equal(500m, balance.TotalEquity);
        Assert.Equal(profit.NetIncome, balance.CurrentEarnings);
        Assert.Equal(balance.TotalAssets, balance.TotalLiabilitiesAndEquity);
        Assert.Equal(balance.TotalAssets, Assert.Single(balance.AssetLines).Amount);
        Assert.Equal(2, drill.Lines.Count);
        Assert.Equal(profit.TotalRevenue, drill.TotalDebit);
        Assert.Equal(profit.TotalExpenses, drill.TotalCredit);
        Assert.Equal(1800m, trial.TotalDebit);
        Assert.Equal(trial.TotalDebit, trial.TotalCredit);
        Assert.Equal(trial.EndingDebitTotal, trial.EndingCreditTotal);
        Assert.Equal(4, trial.Lines.Count);
        Assert.Equal(balance.TotalAssets, trial.Lines.Single(line => line.AccountId == cashId).EndingDebit);
        Assert.Equal(profit.TotalRevenue, trial.Lines.Single(line => line.AccountId == revenueId).EndingCredit);
        Assert.Equal(profit.TotalExpenses, trial.Lines.Single(line => line.AccountId == expenseId).EndingDebit);
        Assert.NotNull(profit.PriorPeriod);
        Assert.Equal(0m, profit.PriorPeriod.NetIncome);
        Assert.NotNull(balance.PriorPeriod);
        Assert.Equal(500m, balance.PriorPeriod.TotalAssets);
        Assert.Equal(500m, balance.PriorPeriod.TotalEquity);

        var profitCsv = await client.GetStringAsync("/api/reports/profit-and-loss/export?startDate=2026-04-01&endDate=2026-04-30&priorStartDate=2026-03-01&priorEndDate=2026-03-31");
        Assert.Contains("Revenue,4000,Revenue,1000", profitCsv);
        Assert.Contains("Expense,5000,Expense,300", profitCsv);
        Assert.Contains("Net Income,,,700", profitCsv);
        Assert.Contains("Net Income Variance,,,700", profitCsv);
        var balanceCsv = await client.GetStringAsync("/api/reports/balance-sheet/export?asOfDate=2026-04-30&priorAsOfDate=2026-03-31");
        Assert.Contains("Total Assets,,,1200", balanceCsv);
        Assert.Contains("Prior Total Assets,,,500", balanceCsv);
        Assert.Contains("Assets Variance,,,700", balanceCsv);
        var trialCsv = await client.GetStringAsync("/api/reports/trial-balance/export?asOfDate=2026-04-30");
        Assert.Contains("1000,Cash,1500,300,1200,0", trialCsv);
        Assert.Contains("TOTAL,,1800,1800,1500,1500", trialCsv);
        var drillCsv = await client.GetStringAsync($"/api/reports/account-drill-down/{cashId}/export?startDate=2026-04-01&endDate=2026-04-30");
        Assert.Contains("TOTAL,,,1000,300", drillCsv);

        client.SetBearerToken(otherTenantId, AppPermissions.Reports.View);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/reports/account-drill-down/{cashId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/reports/account-drill-down/{cashId}/export")).StatusCode);
    }

    [Fact]
    public async Task Reports_PopulatedAging_ReconcilesBucketsCurrenciesAndDashboardWithoutTenantLeakage()
    {
        await using var factory = new ReportingSeededWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var asOf = new DateOnly(2026, 4, 30);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "C-AGING", Name = "Aging Customer" });
            db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "S-AGING", Name = "Aging Supplier" });

            void AddInvoices(Guid owner, int age, decimal outstanding, string currency, InvoiceStatus status)
            {
                db.SalesInvoices.Add(new SalesInvoice
                {
                    Id = Guid.NewGuid(), TenantId = owner, InvoiceNumber = $"SI-{Guid.NewGuid():N}", CustomerId = customerId,
                    InvoiceDate = asOf.AddDays(-100), DueDate = asOf.AddDays(-age), CurrencyCode = currency, Status = status,
                    GrandTotal = outstanding + 30m, PaidTotal = 10m, AppliedCreditTotal = 20m,
                });
                db.PurchaseInvoices.Add(new PurchaseInvoice
                {
                    Id = Guid.NewGuid(), TenantId = owner, InvoiceNumber = $"PI-{Guid.NewGuid():N}", SupplierId = supplierId,
                    InvoiceDate = asOf.AddDays(-100), DueDate = asOf.AddDays(-age), CurrencyCode = currency, Status = status,
                    GrandTotal = outstanding + 10m, PaidTotal = 10m,
                });
            }

            var ages = new[] { -1, 0, 1, 30, 31, 60, 61, 90, 91 };
            for (var index = 0; index < ages.Length; index++)
                AddInvoices(tenantId, ages[index], (index + 1) * 10m, "USD", InvoiceStatus.PartiallyPaid);

            AddInvoices(tenantId, -1, 17m, "EUR", InvoiceStatus.PartiallyPaid);
            AddInvoices(tenantId, 1, 9000m, "USD", InvoiceStatus.Draft);
            AddInvoices(tenantId, 1, 8000m, "USD", InvoiceStatus.Cancelled);
            AddInvoices(tenantId, 1, 0m, "USD", InvoiceStatus.Paid);
            AddInvoices(otherTenantId, 1, 7000m, "USD", InvoiceStatus.PartiallyPaid);
            await db.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Reports.View);
        var receivables = await client.GetFromJsonAsync<ArAgingReportResponse>("/api/reports/ar-aging?asOfDate=2026-04-30");
        var payables = await client.GetFromJsonAsync<ApAgingReportResponse>("/api/reports/ap-aging?asOfDate=2026-04-30");
        var dashboard = await client.GetFromJsonAsync<FinanceDashboardSnapshotResponse>("/api/reports/dashboard?asOfDate=2026-04-30&periodDays=30");
        Assert.NotNull(receivables);
        Assert.NotNull(payables);
        Assert.NotNull(dashboard);
        Assert.Equal(2, receivables.Items.Count);
        Assert.Equal(2, payables.Items.Count);

        foreach (var buckets in new[]
        {
            receivables.Items.Single(item => item.CurrencyCode == "USD").Buckets,
            payables.Items.Single(item => item.CurrencyCode == "USD").Buckets,
        })
        {
            Assert.Equal(30m, buckets.Current);
            Assert.Equal(70m, buckets.Due1To30);
            Assert.Equal(110m, buckets.Due31To60);
            Assert.Equal(150m, buckets.Due61To90);
            Assert.Equal(90m, buckets.DueOver90);
            Assert.Equal(450m, buckets.Total);
            Assert.Equal(buckets.Total, buckets.Current + buckets.Due1To30 + buckets.Due31To60 + buckets.Due61To90 + buckets.DueOver90);
        }

        Assert.Equal(17m, receivables.Items.Single(item => item.CurrencyCode == "EUR").Buckets.Current);
        Assert.Equal(17m, payables.Items.Single(item => item.CurrencyCode == "EUR").Buckets.Current);
        Assert.Equal(receivables.Items.Sum(item => item.Buckets.Total), receivables.Totals.Total);
        Assert.Equal(payables.Items.Sum(item => item.Buckets.Total), payables.Totals.Total);
        Assert.Equal(467m, receivables.Totals.Total);
        Assert.Equal(467m, payables.Totals.Total);
        Assert.Equal(receivables.Totals.Total, dashboard.ReceivablesOpen);
        Assert.Equal(payables.Totals.Total, dashboard.PayablesOpen);
        Assert.Equal(420m, dashboard.ReceivablesOverdue);
        Assert.Equal(420m, dashboard.PayablesOverdue);
    }

    [Theory]
    [InlineData("=1+1")]
    [InlineData("+1+1")]
    [InlineData("-1+1")]
    [InlineData("@SUM(1)")]
    [InlineData("\t=1+1")]
    [InlineData("\r=1+1")]
    [InlineData("\n=1+1")]
    [InlineData("  =1+1")]
    [InlineData("=SUM(\"1\",2)")]
    public async Task Reports_Exports_NeutralizeFormulaText(string unsafeText)
    {
        await using var factory = new ReportingSeededWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var cashId = Guid.NewGuid();
        var revenueId = Guid.NewGuid();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Accounts.AddRange(
                new Account { Id = cashId, TenantId = tenantId, Code = unsafeText, Name = unsafeText, AccountType = AccountType.Asset },
                new Account { Id = revenueId, TenantId = tenantId, Code = unsafeText, Name = unsafeText, AccountType = AccountType.Revenue });
            db.JournalEntries.Add(new JournalEntry
            {
                Id = Guid.NewGuid(), TenantId = tenantId, JournalNumber = unsafeText, Description = unsafeText,
                PostingDate = new DateOnly(2026, 4, 15), Status = JournalEntryStatus.Posted, TotalDebit = 125m, TotalCredit = 125m,
                Lines = new List<JournalEntryLine>
                {
                    new() { Id = Guid.NewGuid(), TenantId = tenantId, AccountId = cashId, LineNumber = 1, DebitAmount = 125m },
                    new() { Id = Guid.NewGuid(), TenantId = tenantId, AccountId = revenueId, LineNumber = 2, CreditAmount = 125m },
                },
            });
            await db.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        client.SetBearerToken(tenantId, AppPermissions.Reports.View);
        var escapedText = "'" + unsafeText;
        if (escapedText.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0)
            escapedText = "\"" + escapedText.Replace("\"", "\"\"") + "\"";

        foreach (var route in new[]
        {
            "profit-and-loss/export?startDate=2026-04-01&endDate=2026-04-30",
            "balance-sheet/export?asOfDate=2026-04-30",
            "trial-balance/export?asOfDate=2026-04-30",
            $"account-drill-down/{cashId}/export?startDate=2026-04-01&endDate=2026-04-30",
        })
        {
            var response = await client.GetAsync("/api/reports/" + route);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
            var csv = await response.Content.ReadAsStringAsync();
            Assert.Contains($"{escapedText},{escapedText},125", csv);
        }
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
