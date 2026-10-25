using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class PostingServiceTests
{
    [Fact]
    public async Task PostSalesInvoice_CreatesBalancedJournalEntry()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var salesInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var taxAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = salesInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-POST-1",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 10m,
            GrandTotal = 110m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);
        SeedAccount(dbContext, taxAccountId, tenantId, "2100", "Output Tax", AccountType.Liability, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, taxAccountId, postingDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var journal = await dbContext.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == result.Value!.Id);
        Assert.Equal(JournalEntryStatus.Posted, journal.Status);
        Assert.Equal(110m, journal.TotalDebit);
        Assert.Equal(110m, journal.TotalCredit);
        Assert.Equal(3, journal.Lines.Count);
        Assert.Equal(journal.TotalDebit, journal.Lines.Sum(x => x.DebitAmount));
        Assert.Equal(journal.TotalCredit, journal.Lines.Sum(x => x.CreditAmount));
    }

    [Fact]
    public async Task PostSalesInvoice_ClosedOrMissingFiscalPeriod_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var salesInvoiceId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = salesInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-POST-2",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, Guid.NewGuid(), tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: true);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("No open fiscal period found for posting date.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_DuplicatePosting_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var salesInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = salesInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-POST-3",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = salesInvoiceId,
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
        });

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("Sales invoice has already been posted.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostPurchaseInvoice_CreatesBalancedJournalEntry()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var taxAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-POST-1",
            SupplierId = supplierId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 80m,
            TaxTotal = 20m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "Accounts Payable", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit);
        SeedAccount(dbContext, taxAccountId, tenantId, "1200", "Input Tax", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostPurchaseInvoiceAsync(purchaseInvoiceId, apAccountId, expenseAccountId, taxAccountId, postingDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var journal = await dbContext.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == result.Value!.Id);
        Assert.Equal(JournalEntryStatus.Posted, journal.Status);
        Assert.Equal(100m, journal.TotalDebit);
        Assert.Equal(100m, journal.TotalCredit);
        Assert.Equal(3, journal.Lines.Count);
        Assert.Equal(journal.TotalDebit, journal.Lines.Sum(x => x.DebitAmount));
        Assert.Equal(journal.TotalCredit, journal.Lines.Sum(x => x.CreditAmount));
    }

    [Fact]
    public async Task PostCustomerPayment_CreatesBalancedJournalEntry()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var salesInvoiceId = Guid.NewGuid();
        var customerPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-CP-1", Name = "Customer Payment Test" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = salesInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-CP-1",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.PartiallyPaid,
            Subtotal = 200m,
            TaxTotal = 0m,
            GrandTotal = 200m,
            PaidTotal = 50m,
        });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = customerPaymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            SalesInvoiceId = salesInvoiceId,
            PaymentDate = postingDate,
            Amount = 150m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash in Bank", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(customerPaymentId, cashAccountId, arAccountId, postingDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var journal = await dbContext.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == result.Value!.Id);
        Assert.Equal(nameof(CustomerPayment), journal.SourceDocumentType);
        Assert.Equal(customerPaymentId, journal.SourceDocumentId);
        Assert.Equal(150m, journal.TotalDebit);
        Assert.Equal(150m, journal.TotalCredit);
        Assert.Equal(2, journal.Lines.Count);
        Assert.Equal(journal.TotalDebit, journal.Lines.Sum(x => x.DebitAmount));
        Assert.Equal(journal.TotalCredit, journal.Lines.Sum(x => x.CreditAmount));
    }

    [Fact]
    public async Task PostVendorPayment_CreatesBalancedJournalEntry()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var vendorPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-VP-1", Name = "Vendor Payment Test" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-VP-1",
            SupplierId = supplierId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.PartiallyPaid,
            Subtotal = 300m,
            TaxTotal = 0m,
            GrandTotal = 300m,
            PaidTotal = 100m,
        });
        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = vendorPaymentId,
            TenantId = tenantId,
            SupplierId = supplierId,
            PurchaseInvoiceId = purchaseInvoiceId,
            PaymentDate = postingDate,
            Amount = 200m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "VP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "Accounts Payable", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash in Bank", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostVendorPaymentAsync(vendorPaymentId, apAccountId, cashAccountId, postingDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var journal = await dbContext.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == result.Value!.Id);
        Assert.Equal(nameof(VendorPayment), journal.SourceDocumentType);
        Assert.Equal(vendorPaymentId, journal.SourceDocumentId);
        Assert.Equal(200m, journal.TotalDebit);
        Assert.Equal(200m, journal.TotalCredit);
        Assert.Equal(2, journal.Lines.Count);
        Assert.Equal(journal.TotalDebit, journal.Lines.Sum(x => x.DebitAmount));
        Assert.Equal(journal.TotalCredit, journal.Lines.Sum(x => x.CreditAmount));
    }

    [Fact]
    public async Task ManualJournal_CreateDraftThenPost_CreatesBalancedImmutableEntry()
    {
        var tenantId = Guid.NewGuid();
        var debitAccountId = Guid.NewGuid();
        var creditAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        SeedFiscalPeriod(dbContext, Guid.NewGuid(), tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), false);
        SeedAccount(dbContext, debitAccountId, tenantId, "6100", "Office expense", AccountType.Expense, NormalBalanceType.Debit);
        SeedAccount(dbContext, creditAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var created = await service.CreateManualJournalAsync(postingDate, "Office supplies", [
            new CreateManualJournalLineRequest { AccountId = debitAccountId, DebitAmount = 25m },
            new CreateManualJournalLineRequest { AccountId = creditAccountId, CreditAmount = 25m },
        ]);

        Assert.True(created.Succeeded);
        Assert.Equal(JournalEntryStatus.Draft, created.Value!.Status);
        Assert.Equal("ManualJournal", created.Value.SourceDocumentType);

        var posted = await service.PostManualJournalAsync(created.Value.Id);

        Assert.True(posted.Succeeded);
        Assert.Equal(JournalEntryStatus.Posted, posted.Value!.Status);
        Assert.Equal(25m, posted.Value.TotalDebit);
        Assert.Equal(25m, posted.Value.TotalCredit);
    }

    [Fact]
    public async Task ManualJournal_UnbalancedLines_AreRejectedWithoutPersistence()
    {
        var tenantId = Guid.NewGuid();
        var debitAccountId = Guid.NewGuid();
        var creditAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        SeedFiscalPeriod(dbContext, Guid.NewGuid(), tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), false);
        SeedAccount(dbContext, debitAccountId, tenantId, "6100", "Office expense", AccountType.Expense, NormalBalanceType.Debit);
        SeedAccount(dbContext, creditAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateManualJournalAsync(postingDate, "Unbalanced", [
            new CreateManualJournalLineRequest { AccountId = debitAccountId, DebitAmount = 25m },
            new CreateManualJournalLineRequest { AccountId = creditAccountId, CreditAmount = 20m },
        ]);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Empty(dbContext.JournalEntries);
    }

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
