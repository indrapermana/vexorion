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
}
