using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class ReportingServiceBranchTests
{
    // ============= GetProfitAndLossAsync Branch Tests =============

    [Fact]
    public async Task GetProfitAndLoss_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetProfitAndLossAsync(new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Tenant context is required.", result.ErrorMessage);
    }

    [Fact]
    public async Task GetProfitAndLoss_InvalidDateRange_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetProfitAndLossAsync(new DateOnly(2026, 4, 30), new DateOnly(2026, 4, 1));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("start date cannot be after period end date", result.ErrorMessage);
    }

    [Fact]
    public async Task GetProfitAndLoss_NoActivity_ReturnsZeroAmounts()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 4, 1);
        var endDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, startDate, endDate, isClosed: false);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetProfitAndLossAsync(startDate, endDate);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.RevenueLines);
        Assert.Empty(result.Value.ExpenseLines);
        Assert.Equal(0m, result.Value.TotalRevenue);
        Assert.Equal(0m, result.Value.TotalExpenses);
        Assert.Equal(0m, result.Value.NetIncome);
    }

    [Fact]
    public async Task GetProfitAndLoss_WithRevenueAndExpenses_CalculatesNetIncome()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 4, 1);
        var endDate = new DateOnly(2026, 4, 30);
        var journalDate = new DateOnly(2026, 4, 15);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, startDate, endDate, isClosed: false);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-001",
            PostingDate = journalDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 1000m,
            TotalCredit = 1000m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = arAccountId, LineNumber = 1, DebitAmount = 1000m },
                new JournalEntryLine { TenantId = tenantId, AccountId = revenueAccountId, LineNumber = 2, CreditAmount = 1000m },
            }
        });

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-002",
            PostingDate = journalDate.AddDays(5),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 300m,
            TotalCredit = 300m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = expenseAccountId, LineNumber = 1, DebitAmount = 300m },
                new JournalEntryLine { TenantId = tenantId, AccountId = arAccountId, LineNumber = 2, CreditAmount = 300m },
            }
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetProfitAndLossAsync(startDate, endDate);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.RevenueLines);
        Assert.Single(result.Value.ExpenseLines);
        Assert.Equal(1000m, result.Value.TotalRevenue);
        Assert.Equal(300m, result.Value.TotalExpenses);
        Assert.Equal(700m, result.Value.NetIncome);
    }

    // ============= GetBalanceSheetAsync Branch Tests =============

    [Fact]
    public async Task GetBalanceSheet_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetBalanceSheetAsync(new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetBalanceSheet_NoActivity_ReturnsZeroBalances()
    {
        var tenantId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetBalanceSheetAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.AssetLines);
        Assert.Empty(result.Value.LiabilityLines);
        Assert.Empty(result.Value.EquityLines);
        Assert.Equal(0m, result.Value.TotalAssets);
        Assert.Equal(0m, result.Value.TotalLiabilities);
    }

    [Fact]
    public async Task GetBalanceSheet_WithAccountActivity_CalculatesTotals()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var assetAccountId = Guid.NewGuid();
        var liabilityAccountId = Guid.NewGuid();
        var equityAccountId = Guid.NewGuid();
        var journalDate = new DateOnly(2026, 4, 15);
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), asOfDate, isClosed: false);
        SeedAccount(dbContext, assetAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, liabilityAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, equityAccountId, tenantId, "3000", "Equity", AccountType.Equity, NormalBalanceType.Credit);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-001",
            PostingDate = journalDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 5000m,
            TotalCredit = 5000m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = assetAccountId, LineNumber = 1, DebitAmount = 5000m },
                new JournalEntryLine { TenantId = tenantId, AccountId = equityAccountId, LineNumber = 2, CreditAmount = 5000m },
            }
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetBalanceSheetAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.AssetLines);
        Assert.Empty(result.Value.LiabilityLines);
        Assert.Single(result.Value.EquityLines);
        Assert.Equal(5000m, result.Value.TotalAssets);
    }

    // ============= GetFinanceDashboardSnapshotAsync Branch Tests =============

    [Fact]
    public async Task GetFinanceDashboardSnapshot_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetFinanceDashboardSnapshotAsync(new DateOnly(2026, 4, 30), 30);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetFinanceDashboardSnapshot_PeriodDaysClampedToMinimum()
    {
        var tenantId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetFinanceDashboardSnapshotAsync(asOfDate, 0);

        Assert.True(result.Succeeded);
        Assert.Equal(1, result.Value!.PeriodDays);
    }

    [Fact]
    public async Task GetFinanceDashboardSnapshot_PeriodDaysClampedToMaximum()
    {
        var tenantId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetFinanceDashboardSnapshotAsync(asOfDate, 500);

        Assert.True(result.Succeeded);
        Assert.Equal(365, result.Value!.PeriodDays);
    }

    [Fact]
    public async Task GetFinanceDashboardSnapshot_WithOpenAndOverdueInvoices()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);
        var earlierDate = asOfDate.AddDays(-60);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });

        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "SI-1",
            CustomerId = customerId,
            InvoiceDate = earlierDate,
            DueDate = earlierDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 1000m,
            TaxTotal = 0m,
            GrandTotal = 1000m,
            PaidTotal = 200m,
        });

        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = asOfDate.AddDays(-10),
            Amount = 500m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierId,
            PaymentDate = asOfDate.AddDays(-5),
            Amount = 300m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "VP-001",
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetFinanceDashboardSnapshotAsync(asOfDate, 90);

        Assert.True(result.Succeeded);
        Assert.Equal(800m, result.Value!.ReceivablesOpen);
        Assert.Equal(800m, result.Value.ReceivablesOverdue);
        Assert.Equal(1000m, result.Value.RevenueInPeriod);
        Assert.Equal(500m, result.Value.CashInInPeriod);
        Assert.Equal(300m, result.Value.CashOutInPeriod);
        Assert.Equal(200m, result.Value.NetCashInPeriod);
    }

    // ============= GetArAgingAsync Branch Tests =============

    [Fact]
    public async Task GetArAging_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetArAgingAsync(new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetArAging_NoOpenInvoices_ReturnsEmptyList()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "SI-1",
            CustomerId = customerId,
            InvoiceDate = asOfDate.AddDays(-30),
            DueDate = asOfDate.AddDays(-5),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 1000m,
            TaxTotal = 0m,
            GrandTotal = 1000m,
            PaidTotal = 1000m,
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetArAgingAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.Items);
    }

    [Fact]
    public async Task GetArAging_WithMultipleCustomersAndBuckets()
    {
        var tenantId = Guid.NewGuid();
        var customer1Id = Guid.NewGuid();
        var customer2Id = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customer1Id, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.Customers.Add(new Customer { Id = customer2Id, TenantId = tenantId, CustomerNumber = "CUST-2", Name = "Customer 2" });

        // Customer 1: Due in the future (Current bucket)
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "SI-1",
            CustomerId = customer1Id,
            InvoiceDate = asOfDate.AddDays(-10),
            DueDate = asOfDate.AddDays(5),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 500m,
            TaxTotal = 0m,
            GrandTotal = 500m,
            PaidTotal = 0m,
        });

        // Customer 2: Due 40 days ago (31-60 bucket)
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "SI-2",
            CustomerId = customer2Id,
            InvoiceDate = asOfDate.AddDays(-45),
            DueDate = asOfDate.AddDays(-40),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 1000m,
            TaxTotal = 0m,
            GrandTotal = 1000m,
            PaidTotal = 0m,
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetArAgingAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Items.Count);
        Assert.Equal(500m, result.Value.Items.First().Buckets.Current);
        Assert.Equal(1000m, result.Value.Items.ElementAt(1).Buckets.Due31To60);
        Assert.Equal(1500m, result.Value.Totals.Total);
    }

    // ============= GetApAgingAsync Branch Tests =============

    [Fact]
    public async Task GetApAging_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetApAgingAsync(new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetApAging_WithOpenAndOverduePayables()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });

        // Invoice due 100 days ago (Over90 bucket)
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "PI-1",
            SupplierId = supplierId,
            InvoiceDate = asOfDate.AddDays(-100),
            DueDate = asOfDate.AddDays(-100),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 2000m,
            TaxTotal = 0m,
            GrandTotal = 2000m,
            PaidTotal = 0m,
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetApAgingAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.Items);
        Assert.Equal(2000m, result.Value.Items.First().Buckets.DueOver90);
    }

    // ============= GetTrialBalanceAsync Branch Tests =============

    [Fact]
    public async Task GetTrialBalance_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetTrialBalanceAsync(new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetTrialBalance_NoPostedJournals_ReturnsEmptyList()
    {
        var tenantId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetTrialBalanceAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.Lines);
    }

    [Fact]
    public async Task GetTrialBalance_WithPostedJournals_ReturnsBalancedLines()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var assetAccountId = Guid.NewGuid();
        var liabilityAccountId = Guid.NewGuid();
        var journalDate = new DateOnly(2026, 4, 15);
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), asOfDate, isClosed: false);
        SeedAccount(dbContext, assetAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, liabilityAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-001",
            PostingDate = journalDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 5000m,
            TotalCredit = 5000m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = assetAccountId, LineNumber = 1, DebitAmount = 5000m },
                new JournalEntryLine { TenantId = tenantId, AccountId = liabilityAccountId, LineNumber = 2, CreditAmount = 5000m },
            }
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetTrialBalanceAsync(asOfDate);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Lines.Count);
        Assert.Equal(5000m, result.Value.TotalDebit);
        Assert.Equal(5000m, result.Value.TotalCredit);
        Assert.Equal(5000m, result.Value.EndingDebitTotal);
        Assert.Equal(5000m, result.Value.EndingCreditTotal);
    }

    // ============= GetAccountDrillDownAsync Branch Tests =============

    [Fact]
    public async Task GetAccountDrillDown_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(null));
        var result = await service.GetAccountDrillDownAsync(Guid.NewGuid(), null, new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetAccountDrillDown_AccountNotFound_ReturnsNotFound()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetAccountDrillDownAsync(Guid.NewGuid(), null, new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Account not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task GetAccountDrillDown_NoJournalLines_ReturnsEmptyLines()
    {
        var tenantId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var asOfDate = new DateOnly(2026, 4, 30);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetAccountDrillDownAsync(accountId, null, asOfDate);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!.Lines);
        Assert.Equal(0m, result.Value.TotalDebit);
        Assert.Equal(0m, result.Value.TotalCredit);
    }

    [Fact]
    public async Task GetAccountDrillDown_WithJournalLinesAndDateRange()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var otherAccountId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 4, 1);
        var endDate = new DateOnly(2026, 4, 30);
        var beforeDate = startDate.AddDays(-10);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, startDate, endDate, isClosed: false);
        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, otherAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-001",
            PostingDate = beforeDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 1000m,
            TotalCredit = 1000m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 1000m },
                new JournalEntryLine { TenantId = tenantId, AccountId = otherAccountId, LineNumber = 2, CreditAmount = 1000m },
            }
        });

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-002",
            PostingDate = startDate.AddDays(15),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 500m,
            TotalCredit = 500m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 500m },
                new JournalEntryLine { TenantId = tenantId, AccountId = otherAccountId, LineNumber = 2, CreditAmount = 500m },
            }
        });

        await dbContext.SaveChangesAsync();

        var service = new ReportingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.GetAccountDrillDownAsync(accountId, startDate, endDate);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.Lines);
        Assert.Equal(500m, result.Value.TotalDebit);
        Assert.Equal(0m, result.Value.TotalCredit);
    }

    // ============= Helper Methods =============

    private static void SeedFiscalPeriod(
        AppDbContext dbContext,
        Guid periodId,
        Guid tenantId,
        DateOnly startDate,
        DateOnly endDate,
        bool isClosed)
    {
        dbContext.FiscalPeriods.Add(new FiscalPeriod
        {
            Id = periodId,
            TenantId = tenantId,
            PeriodCode = $"{startDate:yyyy-MM}",
            StartDate = startDate,
            EndDate = endDate,
            IsClosed = isClosed,
        });
    }

    private static void SeedAccount(
        AppDbContext dbContext,
        Guid accountId,
        Guid tenantId,
        string code,
        string name,
        AccountType accountType,
        NormalBalanceType normalBalance)
    {
        dbContext.Accounts.Add(new Account
        {
            Id = accountId,
            TenantId = tenantId,
            Code = code,
            Name = name,
            AccountType = accountType,
            NormalBalance = normalBalance,
            IsPostingAllowed = true,
            IsActive = true,
        });
    }
}
