using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PostingServiceAdditionalTests
{
    [Fact]
    public async Task PostSalesInvoice_NoTenantContext_Fails()
    {
        var tenantId = Guid.NewGuid();
        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.PostSalesInvoiceAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Tenant context is required.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_TaxTotalWithoutTaxAccount_Fails()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var revenueAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 30);

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-PT-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            CustomerId = customerId,
            InvoiceNumber = "SI-TAX-1",
            Status = InvoiceStatus.Issued,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Subtotal = 100m,
            TaxTotal = 10m,
            GrandTotal = 110m,
        });

        SeedFiscalPeriod(dbContext, tenantId, postingDate);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(invoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Tax liability account is required when tax total is greater than zero.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostCustomerPayment_ZeroAmount_Fails()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var paymentId = Guid.NewGuid();

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-CP-2", Name = "Customer" });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = paymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = new DateOnly(2026, 4, 30),
            Amount = 0m,
            CurrencyCode = "USD",
            PaymentMethod = "cash",
        });

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(paymentId, Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 4, 30));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Customer payment amount must be greater than zero.", result.ErrorMessage);
    }

    [Fact]
    public async Task ReverseJournal_PostedEntry_CreatesReversalAndMarksOriginalReversed()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountA = Guid.NewGuid();
        var accountB = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 20);
        var reversalDate = new DateOnly(2026, 4, 30);

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        SeedFiscalPeriod(dbContext, tenantId, reversalDate, periodId);

        var original = new JournalEntry
        {
            TenantId = tenantId,
            JournalNumber = "JRN-ORIG-1",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 50m,
            TotalCredit = 50m,
            Lines =
            [
                new JournalEntryLine { TenantId = tenantId, AccountId = accountA, LineNumber = 1, Description = "D", DebitAmount = 50m, CreditAmount = 0m },
                new JournalEntryLine { TenantId = tenantId, AccountId = accountB, LineNumber = 2, Description = "C", DebitAmount = 0m, CreditAmount = 50m },
            ],
        };

        dbContext.JournalEntries.Add(original);
        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(original.Id, reversalDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var refreshedOriginal = await dbContext.JournalEntries.SingleAsync(x => x.Id == original.Id);
        Assert.Equal(JournalEntryStatus.Reversed, refreshedOriginal.Status);

        var reversal = await dbContext.JournalEntries
            .Include(x => x.Lines)
            .SingleAsync(x => x.Id == result.Value!.Id);

        Assert.Equal(original.Id, reversal.ReversedJournalEntryId);
        Assert.Equal($"{nameof(SalesInvoice)}Reversal", reversal.SourceDocumentType);
        Assert.Equal(2, reversal.Lines.Count);
        Assert.Equal(50m, reversal.TotalDebit);
        Assert.Equal(50m, reversal.TotalCredit);
        Assert.Equal(0m, reversal.Lines.Single(x => x.LineNumber == 1).DebitAmount);
        Assert.Equal(50m, reversal.Lines.Single(x => x.LineNumber == 1).CreditAmount);
    }

    [Fact]
    public async Task ReverseJournal_WhenAlreadyReversed_FailsWithConflict()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var reversalDate = new DateOnly(2026, 4, 30);

        await using var dbContext = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        SeedFiscalPeriod(dbContext, tenantId, reversalDate, periodId);

        var original = new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-ORIG-2",
            SourceDocumentType = nameof(SalesInvoice),
            SourceDocumentId = Guid.NewGuid(),
            PostingDate = new DateOnly(2026, 4, 20),
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 10m,
            TotalCredit = 10m,
            Lines =
            [
                new JournalEntryLine { TenantId = tenantId, AccountId = Guid.NewGuid(), LineNumber = 1, DebitAmount = 10m, CreditAmount = 0m },
                new JournalEntryLine { TenantId = tenantId, AccountId = Guid.NewGuid(), LineNumber = 2, DebitAmount = 0m, CreditAmount = 10m },
            ],
        };

        dbContext.JournalEntries.Add(original);
        dbContext.JournalEntries.Add(new JournalEntry
        {
            TenantId = tenantId,
            JournalNumber = "JRN-REV-EXISTING",
            SourceDocumentType = $"{nameof(SalesInvoice)}Reversal",
            SourceDocumentId = original.SourceDocumentId,
            PostingDate = reversalDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            ReversedJournalEntryId = original.Id,
            TotalDebit = 10m,
            TotalCredit = 10m,
            Lines =
            [
                new JournalEntryLine { TenantId = tenantId, AccountId = Guid.NewGuid(), LineNumber = 1, DebitAmount = 10m, CreditAmount = 0m },
                new JournalEntryLine { TenantId = tenantId, AccountId = Guid.NewGuid(), LineNumber = 2, DebitAmount = 0m, CreditAmount = 10m },
            ],
        });

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(original.Id, reversalDate);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Equal("Journal entry has already been reversed.", result.ErrorMessage);
    }

    private static void SeedFiscalPeriod(AppDbContext dbContext, Guid tenantId, DateOnly date, Guid? periodId = null)
    {
        dbContext.FiscalPeriods.Add(new FiscalPeriod
        {
            Id = periodId ?? Guid.NewGuid(),
            TenantId = tenantId,
            PeriodCode = "2026-04",
            StartDate = new DateOnly(date.Year, date.Month, 1),
            EndDate = new DateOnly(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month)),
            IsClosed = false,
        });
    }

    private static void SeedAccount(AppDbContext dbContext, Guid accountId, Guid tenantId, string code, AccountType accountType, NormalBalanceType normalBalance)
    {
        dbContext.Accounts.Add(new Account
        {
            Id = accountId,
            TenantId = tenantId,
            Code = code,
            Name = code,
            AccountType = accountType,
            NormalBalance = normalBalance,
            IsPostingAllowed = true,
            IsActive = true,
        });
    }
}
