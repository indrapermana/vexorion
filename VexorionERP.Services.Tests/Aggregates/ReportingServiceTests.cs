using VexorionERP.Models.Enums;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;
using VexorionERP.Services;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class ReportingServiceTests
{
    [Fact]
    public async Task GetProfitAndLoss_ReturnsPeriodRevenueExpensesAndNetIncome()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var periodStart = new DateOnly(2026, 4, 1);
        var periodEnd = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.FiscalPeriods.Add(new FiscalPeriod
        {
            Id = periodId,
            TenantId = tenantId,
            PeriodCode = "2026-04",
            StartDate = periodStart,
            EndDate = periodEnd,
            IsClosed = false,
        });

        dbContext.Accounts.AddRange(
            new Account { Id = cashAccountId, TenantId = tenantId, Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = revenueAccountId, TenantId = tenantId, Code = "4000", Name = "Revenue", AccountType = AccountType.Revenue, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = expenseAccountId, TenantId = tenantId, Code = "5000", Name = "Expense", AccountType = AccountType.Expense, NormalBalance = NormalBalanceType.Debit, IsPostingAllowed = true, IsActive = true });

        var salesJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = salesJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-PL-1",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 10),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 1000m,
            TotalCredit = 1000m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = salesJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 1000m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = salesJournalId, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 1000m });

        var expenseJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = expenseJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-PL-2",
            SourceDocumentType = nameof(PurchaseInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 12),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 300m,
            TotalCredit = 300m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = expenseJournalId, AccountId = expenseAccountId, LineNumber = 1, DebitAmount = 300m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = expenseJournalId, AccountId = cashAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 300m });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetProfitAndLossAsync(periodStart, periodEnd);

        Assert.True(result.Succeeded);
        Assert.Equal(1000m, result.Value!.TotalRevenue);
        Assert.Equal(300m, result.Value.TotalExpenses);
        Assert.Equal(700m, result.Value.NetIncome);
        Assert.Single(result.Value.RevenueLines);
        Assert.Single(result.Value.ExpenseLines);
    }

    [Fact]
    public async Task GetBalanceSheet_ReturnsAssetsLiabilitiesEquityAndCurrentEarnings()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var liabilityAccountId = Guid.NewGuid();
        var equityAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
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
            new Account { Id = cashAccountId, TenantId = tenantId, Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = liabilityAccountId, TenantId = tenantId, Code = "2000", Name = "Payables", AccountType = AccountType.Liability, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = equityAccountId, TenantId = tenantId, Code = "3000", Name = "Capital", AccountType = AccountType.Equity, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = revenueAccountId, TenantId = tenantId, Code = "4000", Name = "Revenue", AccountType = AccountType.Revenue, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true });

        var capitalJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = capitalJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-BS-1",
            SourceDocumentType = "Opening",
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 2),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 500m,
            TotalCredit = 500m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = capitalJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 500m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = capitalJournalId, AccountId = equityAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 500m });

        var liabilityJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = liabilityJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-BS-2",
            SourceDocumentType = "Loan",
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 5),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 200m,
            TotalCredit = 200m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = liabilityJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 200m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = liabilityJournalId, AccountId = liabilityAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 200m });

        var revenueJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = revenueJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-BS-3",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 10),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 300m,
            TotalCredit = 300m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = revenueJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 300m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = revenueJournalId, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 300m });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetBalanceSheetAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Equal(1000m, result.Value!.TotalAssets);
        Assert.Equal(200m, result.Value.TotalLiabilities);
        Assert.Equal(500m, result.Value.TotalEquity);
        Assert.Equal(300m, result.Value.CurrentEarnings);
        Assert.Equal(1000m, result.Value.TotalLiabilitiesAndEquity);
    }

    [Fact]
    public async Task GetFinanceDashboardSnapshot_ReturnsReceivablesPayablesRevenueAndCashMetrics()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-KPI", Name = "KPI Customer" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-KPI", Name = "KPI Supplier" });

        var salesInvoiceId = Guid.NewGuid();
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = salesInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-KPI-1",
            CustomerId = customerId,
            InvoiceDate = asOfDate.AddDays(-5),
            DueDate = asOfDate.AddDays(-2),
            CurrencyCode = "USD",
            Status = InvoiceStatus.PartiallyPaid,
            Subtotal = 1000m,
            TaxTotal = 0m,
            GrandTotal = 1000m,
            PaidTotal = 200m,
        });

        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-KPI-1",
            SupplierId = supplierId,
            InvoiceDate = asOfDate.AddDays(-6),
            DueDate = asOfDate.AddDays(-1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 700m,
            TaxTotal = 0m,
            GrandTotal = 700m,
            PaidTotal = 100m,
        });

        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customerId,
            SalesInvoiceId = salesInvoiceId,
            PaymentDate = asOfDate.AddDays(-3),
            Amount = 400m,
            CurrencyCode = "USD",
        });

        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseInvoiceId = purchaseInvoiceId,
            PaymentDate = asOfDate.AddDays(-2),
            Amount = 250m,
            CurrencyCode = "USD",
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetFinanceDashboardSnapshotAsync(asOfDate, 30);

        Assert.True(result.Succeeded);
        Assert.Equal(800m, result.Value!.ReceivablesOpen);
        Assert.Equal(800m, result.Value.ReceivablesOverdue);
        Assert.Equal(600m, result.Value.PayablesOpen);
        Assert.Equal(600m, result.Value.PayablesOverdue);
        Assert.Equal(1000m, result.Value.RevenueInPeriod);
        Assert.Equal(400m, result.Value.CashInInPeriod);
        Assert.Equal(250m, result.Value.CashOutInPeriod);
        Assert.Equal(150m, result.Value.NetCashInPeriod);
    }

    [Fact]
    public async Task GetArAging_AggregatesIntoAgingBuckets()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-AR", Name = "AR Customer" });
        dbContext.SalesInvoices.AddRange(
            new SalesInvoice
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                InvoiceNumber = "SI-CUR",
                CustomerId = customerId,
                InvoiceDate = asOfDate,
                DueDate = asOfDate,
                CurrencyCode = "USD",
                Status = InvoiceStatus.Issued,
                Subtotal = 100m,
                TaxTotal = 0m,
                GrandTotal = 100m,
                PaidTotal = 0m,
            },
            new SalesInvoice
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                InvoiceNumber = "SI-31",
                CustomerId = customerId,
                InvoiceDate = asOfDate.AddDays(-40),
                DueDate = asOfDate.AddDays(-31),
                CurrencyCode = "USD",
                Status = InvoiceStatus.PartiallyPaid,
                Subtotal = 200m,
                TaxTotal = 0m,
                GrandTotal = 200m,
                PaidTotal = 0m,
            });
        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetArAgingAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Equal(300m, result.Value!.Totals.Total);
        Assert.Equal(100m, result.Value.Totals.Current);
        Assert.Equal(200m, result.Value.Totals.Due31To60);
        Assert.Single(result.Value.Items);
    }

    [Fact]
    public async Task GetApAging_AggregatesBySupplier()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-AP", Name = "AP Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "PI-95",
            SupplierId = supplierId,
            InvoiceDate = asOfDate.AddDays(-100),
            DueDate = asOfDate.AddDays(-95),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 450m,
            TaxTotal = 0m,
            GrandTotal = 450m,
            PaidTotal = 0m,
        });
        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetApAgingAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.Items);
        Assert.Equal(450m, result.Value.Totals.DueOver90);
        Assert.Equal(450m, result.Value.Totals.Total);
    }

    [Fact]
    public async Task GetTrialBalance_ReturnsBalancedTotalsFromPostedJournals()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
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
                Id = cashAccountId,
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

        var journalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = journalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260430-0001",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = asOfDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 500m,
            TotalCredit = 500m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                JournalEntryId = journalId,
                AccountId = cashAccountId,
                LineNumber = 1,
                DebitAmount = 500m,
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
                CreditAmount = 500m,
            });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetTrialBalanceAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Equal(500m, result.Value!.TotalDebit);
        Assert.Equal(500m, result.Value.TotalCredit);
        Assert.Equal(500m, result.Value.EndingDebitTotal);
        Assert.Equal(500m, result.Value.EndingCreditTotal);
        Assert.Equal(2, result.Value.Lines.Count);
    }

    [Fact]
    public async Task GetAccountDrillDown_ReturnsJournalLinesForAccount()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var periodStart = new DateOnly(2026, 4, 1);
        var periodEnd = new DateOnly(2026, 4, 30);
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.FiscalPeriods.Add(new FiscalPeriod
        {
            Id = periodId,
            TenantId = tenantId,
            PeriodCode = "2026-04",
            StartDate = periodStart,
            EndDate = periodEnd,
            IsClosed = false,
        });

        dbContext.Accounts.AddRange(
            new Account { Id = cashAccountId, TenantId = tenantId, Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = revenueAccountId, TenantId = tenantId, Code = "4000", Name = "Revenue", AccountType = AccountType.Revenue, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true });

        var journalId1 = Guid.NewGuid();
        var journalId2 = Guid.NewGuid();
        dbContext.JournalEntries.AddRange(
            new JournalEntry
            {
                Id = journalId1,
                TenantId = tenantId,
                JournalNumber = "JRN-DD-1",
                SourceDocumentType = "SalesInvoice",
                SourceDocumentId = Guid.NewGuid(),
                PostingDate = new DateOnly(2026, 4, 5),
                FiscalPeriodId = periodId,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 400m,
                TotalCredit = 400m,
            },
            new JournalEntry
            {
                Id = journalId2,
                TenantId = tenantId,
                JournalNumber = "JRN-DD-2",
                SourceDocumentType = "SalesInvoice",
                SourceDocumentId = Guid.NewGuid(),
                PostingDate = new DateOnly(2026, 4, 15),
                FiscalPeriodId = periodId,
                Status = JournalEntryStatus.Posted,
                TotalDebit = 600m,
                TotalCredit = 600m,
            });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = journalId1, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 400m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = journalId1, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 400m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = journalId2, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 600m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = journalId2, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 600m });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetAccountDrillDownAsync(cashAccountId, periodStart, periodEnd);

        Assert.True(result.Succeeded);
        Assert.Equal(cashAccountId, result.Value!.AccountId);
        Assert.Equal("1000", result.Value.AccountCode);
        Assert.Equal(1000m, result.Value.TotalDebit);
        Assert.Equal(0m, result.Value.TotalCredit);
        Assert.Equal(2, result.Value.Lines.Count);
    }

    [Fact]
    public async Task GetAccountDrillDown_UnknownAccount_ReturnsNotFound()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetAccountDrillDownAsync(Guid.NewGuid(), null, new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task GetProfitAndLoss_WithComparativePeriod_BothPeriodsMathIsCorrect()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.FiscalPeriods.Add(new FiscalPeriod
        {
            Id = periodId,
            TenantId = tenantId,
            PeriodCode = "2026-Q1",
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 4, 30),
            IsClosed = false,
        });

        dbContext.Accounts.AddRange(
            new Account { Id = cashAccountId, TenantId = tenantId, Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit, IsPostingAllowed = true, IsActive = true },
            new Account { Id = revenueAccountId, TenantId = tenantId, Code = "4000", Name = "Revenue", AccountType = AccountType.Revenue, NormalBalance = NormalBalanceType.Credit, IsPostingAllowed = true, IsActive = true });

        // Current period journal (April)
        var currentJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = currentJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-CMP-1",
            SourceDocumentType = "SalesInvoice",
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 10),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 800m,
            TotalCredit = 800m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = currentJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 800m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = currentJournalId, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 800m });

        // Prior period journal (March)
        var priorJournalId = Guid.NewGuid();
        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = priorJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-CMP-2",
            SourceDocumentType = "SalesInvoice",
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 3, 20),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 500m,
            TotalCredit = 500m,
        });
        dbContext.JournalEntryLines.AddRange(
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = priorJournalId, AccountId = cashAccountId, LineNumber = 1, DebitAmount = 500m, CreditAmount = 0m },
            new JournalEntryLine { Id = Guid.NewGuid(), TenantId = tenantId, JournalEntryId = priorJournalId, AccountId = revenueAccountId, LineNumber = 2, DebitAmount = 0m, CreditAmount = 500m });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));

        var currentResult = await service.GetProfitAndLossAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));
        var priorResult = await service.GetProfitAndLossAsync(new DateOnly(2026, 3, 1), new DateOnly(2026, 3, 31));

        Assert.True(currentResult.Succeeded);
        Assert.True(priorResult.Succeeded);
        Assert.Equal(800m, currentResult.Value!.TotalRevenue);
        Assert.Equal(500m, priorResult.Value!.TotalRevenue);
        // Verify they are isolated period queries
        Assert.NotEqual(currentResult.Value.TotalRevenue, priorResult.Value.TotalRevenue);
    }
}
