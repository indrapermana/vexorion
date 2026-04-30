using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class PostingServiceBranchTests
{
    // ============= PostSalesInvoice Branch Tests =============

    [Fact]
    public async Task PostSalesInvoice_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.PostSalesInvoiceAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, new DateOnly(2026, 4, 26));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Tenant context is required.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_DraftInvoice_IsRejected()
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
            InvoiceNumber = "SI-DRAFT-1",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Sales invoice is not eligible for posting.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_CancelledInvoice_IsRejected()
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
            InvoiceNumber = "SI-CANCELLED-1",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Cancelled,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostSalesInvoice_ReversedInvoice_IsRejected()
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
            InvoiceNumber = "SI-REVERSED-1",
            CustomerId = customerId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
            ReversedAtUtc = DateTime.UtcNow,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostSalesInvoice_InvalidReceivableAccount_IsRejected()
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
            InvoiceNumber = "SI-INV-AR-1",
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
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "Accounts Receivable", AccountType.Asset, NormalBalanceType.Debit, isPostingAllowed: false);
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("not eligible for posting", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_InactiveRevenueAccount_IsRejected()
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
            InvoiceNumber = "SI-INV-REV-1",
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
        SeedAccount(dbContext, revenueAccountId, tenantId, "4000", "Revenue", AccountType.Revenue, NormalBalanceType.Credit, isActive: false);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostSalesInvoice_MissingTaxAccountWhenTaxGreaterThanZero_IsRejected()
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
            InvoiceNumber = "SI-TAX-MISS-1",
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

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Tax liability account is required", result.ErrorMessage);
    }

    [Fact]
    public async Task PostSalesInvoice_InvalidTaxAccount_IsRejected()
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
            InvoiceNumber = "SI-TAX-INV-1",
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
        SeedAccount(dbContext, taxAccountId, tenantId, "2100", "Output Tax", AccountType.Liability, NormalBalanceType.Credit, isPostingAllowed: false);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, taxAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostSalesInvoice_NoTax_CreatesBalancedJournalWith2Lines()
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
            InvoiceNumber = "SI-NO-TAX-1",
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

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostSalesInvoiceAsync(salesInvoiceId, arAccountId, revenueAccountId, null, postingDate);

        Assert.True(result.Succeeded);
        var journal = await dbContext.JournalEntries.Include(x => x.Lines).SingleAsync(x => x.Id == result.Value!.Id);
        Assert.Equal(2, journal.Lines.Count);
        Assert.Equal(100m, journal.TotalDebit);
        Assert.Equal(100m, journal.TotalCredit);
    }

    // ============= PostPurchaseInvoice Branch Tests =============

    [Fact]
    public async Task PostPurchaseInvoice_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.PostPurchaseInvoiceAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null, new DateOnly(2026, 4, 26));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostPurchaseInvoice_DraftInvoice_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-DRAFT-1",
            SupplierId = supplierId,
            InvoiceDate = postingDate,
            DueDate = postingDate.AddDays(30),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
            Subtotal = 100m,
            TaxTotal = 0m,
            GrandTotal = 100m,
            PaidTotal = 0m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "Accounts Payable", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostPurchaseInvoiceAsync(purchaseInvoiceId, apAccountId, expenseAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostPurchaseInvoice_InvalidExpenseAccount_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-INV-EXP-1",
            SupplierId = supplierId,
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
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "Accounts Payable", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit, isActive: false);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostPurchaseInvoiceAsync(purchaseInvoiceId, apAccountId, expenseAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostPurchaseInvoice_MissingTaxAccountWhenTaxGreaterThanZero_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var purchaseInvoiceId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var expenseAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = purchaseInvoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-TAX-MISS-1",
            SupplierId = supplierId,
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
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "Accounts Payable", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, expenseAccountId, tenantId, "5000", "Expense", AccountType.Expense, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostPurchaseInvoiceAsync(purchaseInvoiceId, apAccountId, expenseAccountId, null, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Tax receivable account is required", result.ErrorMessage);
    }

    // ============= PostCustomerPayment Branch Tests =============

    [Fact]
    public async Task PostCustomerPayment_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.PostCustomerPaymentAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 4, 26));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostCustomerPayment_PaymentNotFound_ReturnsNotFound()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(Guid.NewGuid(), cashAccountId, arAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Customer payment not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostCustomerPayment_AmountZero_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var customerPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = customerPaymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = postingDate,
            Amount = 0m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(customerPaymentId, cashAccountId, arAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("must be greater than zero", result.ErrorMessage);
    }

    [Fact]
    public async Task PostCustomerPayment_AmountNegative_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var customerPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = customerPaymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = postingDate,
            Amount = -50m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(customerPaymentId, cashAccountId, arAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostCustomerPayment_DuplicatePosting_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var customerPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = customerPaymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = postingDate,
            Amount = 100m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = nameof(CustomerPayment),
            SourceDocumentId = customerPaymentId,
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(customerPaymentId, cashAccountId, arAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Contains("already been posted", result.ErrorMessage);
    }

    [Fact]
    public async Task PostCustomerPayment_InvalidCashAccount_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var customerPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var arAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer 1" });
        dbContext.CustomerPayments.Add(new CustomerPayment
        {
            Id = customerPaymentId,
            TenantId = tenantId,
            CustomerId = customerId,
            PaymentDate = postingDate,
            Amount = 100m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "CP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit, isPostingAllowed: false);
        SeedAccount(dbContext, arAccountId, tenantId, "1100", "AR", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostCustomerPaymentAsync(customerPaymentId, cashAccountId, arAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    // ============= PostVendorPayment Branch Tests =============

    [Fact]
    public async Task PostVendorPayment_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.PostVendorPaymentAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 4, 26));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task PostVendorPayment_PaymentNotFound_ReturnsNotFound()
    {
        var tenantId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostVendorPaymentAsync(Guid.NewGuid(), apAccountId, cashAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Vendor payment not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task PostVendorPayment_AmountZero_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var vendorPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = vendorPaymentId,
            TenantId = tenantId,
            SupplierId = supplierId,
            PaymentDate = postingDate,
            Amount = 0m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "VP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostVendorPaymentAsync(vendorPaymentId, apAccountId, cashAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("must be greater than zero", result.ErrorMessage);
    }

    [Fact]
    public async Task PostVendorPayment_DuplicatePosting_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var vendorPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = vendorPaymentId,
            TenantId = tenantId,
            SupplierId = supplierId,
            PaymentDate = postingDate,
            Amount = 100m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "VP-001",
        });

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = nameof(VendorPayment),
            SourceDocumentId = vendorPaymentId,
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostVendorPaymentAsync(vendorPaymentId, apAccountId, cashAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task PostVendorPayment_InvalidPayableAccount_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var vendorPaymentId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var apAccountId = Guid.NewGuid();
        var cashAccountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier 1" });
        dbContext.VendorPayments.Add(new VendorPayment
        {
            Id = vendorPaymentId,
            TenantId = tenantId,
            SupplierId = supplierId,
            PaymentDate = postingDate,
            Amount = 100m,
            CurrencyCode = "USD",
            PaymentMethod = "bank_transfer",
            ReferenceNumber = "VP-001",
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, apAccountId, tenantId, "2000", "AP", AccountType.Liability, NormalBalanceType.Credit, isActive: false);
        SeedAccount(dbContext, cashAccountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.PostVendorPaymentAsync(vendorPaymentId, apAccountId, cashAccountId, postingDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    // ============= ReverseJournal Branch Tests =============

    [Fact]
    public async Task ReverseJournal_NoTenantContext_ReturnsError()
    {
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(null));
        var result = await service.ReverseJournalAsync(Guid.NewGuid(), new DateOnly(2026, 4, 27));

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ReverseJournal_JournalNotFound_ReturnsNotFound()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(Guid.NewGuid(), new DateOnly(2026, 4, 27));

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("Journal entry not found.", result.ErrorMessage);
    }

    [Fact]
    public async Task ReverseJournal_DraftJournal_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var journalId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        var reversalDate = new DateOnly(2026, 4, 27);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = journalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = "Manual",
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Draft,
            TotalDebit = 100m,
            TotalCredit = 100m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 100m },
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 2, CreditAmount = 100m },
            }
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(journalId, reversalDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("Only posted journal entries can be reversed", result.ErrorMessage);
    }

    [Fact]
    public async Task ReverseJournal_AlreadyReversed_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var journalId = Guid.NewGuid();
        var reversalJournalId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        var reversalDate = new DateOnly(2026, 4, 27);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = journalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = "Manual",
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 100m },
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 2, CreditAmount = 100m },
            }
        });

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = reversalJournalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260427-0001",
            SourceDocumentType = "ManualReversal",
            SourceDocumentId = journalId,
            PostingDate = reversalDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            ReversedJournalEntryId = journalId,
            TotalDebit = 100m,
            TotalCredit = 100m,
            Lines = new List<JournalEntryLine>()
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(journalId, reversalDate);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
        Assert.Contains("already been reversed", result.ErrorMessage);
    }

    [Fact]
    public async Task ReverseJournal_NoOpenFiscalPeriod_IsRejected()
    {
        var tenantId = Guid.NewGuid();
        var journalId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        var reversalDate = new DateOnly(2026, 5, 27);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = journalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = "Manual",
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 100m },
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 2, CreditAmount = 100m },
            }
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(journalId, reversalDate);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Contains("No open fiscal period", result.ErrorMessage);
    }

    [Fact]
    public async Task ReverseJournal_Success_CreatesReversalJournalAndMarksOriginalAsReversed()
    {
        var tenantId = Guid.NewGuid();
        var journalId = Guid.NewGuid();
        var periodId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var postingDate = new DateOnly(2026, 4, 26);
        var reversalDate = new DateOnly(2026, 4, 27);

        var databaseName = Guid.NewGuid().ToString();
        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);

        dbContext.JournalEntries.Add(new JournalEntry
        {
            Id = journalId,
            TenantId = tenantId,
            JournalNumber = "JRN-20260426-0001",
            SourceDocumentType = "Manual",
            PostingDate = postingDate,
            FiscalPeriodId = periodId,
            Status = JournalEntryStatus.Posted,
            TotalDebit = 100m,
            TotalCredit = 100m,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 1, DebitAmount = 100m },
                new JournalEntryLine { TenantId = tenantId, AccountId = accountId, LineNumber = 2, CreditAmount = 100m },
            }
        });

        SeedFiscalPeriod(dbContext, periodId, tenantId, new DateOnly(2026, 4, 1), new DateOnly(2026, 4, 30), isClosed: false);
        SeedAccount(dbContext, accountId, tenantId, "1000", "Cash", AccountType.Asset, NormalBalanceType.Debit);

        await dbContext.SaveChangesAsync();

        var service = new PostingService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ReverseJournalAsync(journalId, reversalDate);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);

        var reversalJournal = result.Value;
        Assert.Equal("ManualReversal", reversalJournal.SourceDocumentType);
        Assert.Equal(journalId, reversalJournal.ReversedJournalEntryId);
        Assert.Equal(100m, reversalJournal.TotalDebit);
        Assert.Equal(100m, reversalJournal.TotalCredit);
        Assert.Equal(2, reversalJournal.Lines.Count);

        var originalJournal = await dbContext.JournalEntries.SingleAsync(x => x.Id == journalId);
        Assert.Equal(JournalEntryStatus.Reversed, originalJournal.Status);
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
        NormalBalanceType normalBalance,
        bool isPostingAllowed = true,
        bool isActive = true)
    {
        dbContext.Accounts.Add(new Account
        {
            Id = accountId,
            TenantId = tenantId,
            Code = code,
            Name = name,
            AccountType = accountType,
            NormalBalance = normalBalance,
            IsPostingAllowed = isPostingAllowed,
            IsActive = isActive,
        });
    }
}
