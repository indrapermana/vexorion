using VexorionERP.Contracts.Sales.Invoices;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Finance;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Sales;
using VexorionERP.Services;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class SalesInvoiceCommandServiceTests
{
    [Fact]
    public async Task Create_WithValidRequest_ReturnsDraftInvoiceWithZeroTotals()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-001",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal("SI-001", result.Value.InvoiceNumber);
        Assert.Equal(0m, result.Value.Subtotal);
        Assert.Equal(0m, result.Value.GrandTotal);
        Assert.Equal(InvoiceStatus.Draft, result.Value.Status);
    }

    [Fact]
    public async Task Create_WithPaymentTerm_SetsDueDateFromTerm()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.PaymentTerms.Add(new PaymentTerm { Id = termId, TenantId = tenantId, Code = "NET30", Name = "Net 30", DaysDue = 30 });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-002",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 4, 1), // should be overridden
            PaymentTermId = termId,
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.Equal(new DateOnly(2026, 5, 1), result.Value!.DueDate);
    }

    [Fact]
    public async Task Create_FromSalesOrder_CopiesLinesAndTotals()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var salesOrderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main warehouse" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = salesOrderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 10),
            CurrencyCode = "usd",
            Status = DocumentStatus.Confirmed,
            Lines =
            [
                new SalesOrderLine
                {
                    TenantId = tenantId,
                    ProductId = productId,
                    Quantity = 2m,
                    UnitPrice = 25m,
                    DiscountAmount = 5m,
                }
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-SOURCE",
            CustomerId = Guid.Empty,
            SourceSalesOrderId = salesOrderId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = string.Empty,
        });

        Assert.True(result.Succeeded);
        Assert.Equal(customerId, result.Value!.CustomerId);
        Assert.Equal("USD", result.Value.CurrencyCode);
        Assert.Equal(salesOrderId, result.Value.SourceSalesOrderId);
        Assert.Equal(45m, result.Value.Subtotal);
        Assert.Equal(45m, result.Value.GrandTotal);

        var lines = dbContext.SalesInvoiceLines.Where(x => x.SalesInvoiceId == result.Value.Id).ToList();
        Assert.Single(lines);
        Assert.Equal(productId, lines[0].ProductId);
        Assert.Equal(2m, lines[0].Quantity);
        Assert.Equal(25m, lines[0].UnitPrice);
        Assert.Equal(5m, lines[0].DiscountAmount);
    }

    [Fact]
    public async Task Create_DuplicateInvoiceNumber_ReturnsConflict()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "SI-DUP",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-DUP",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_PostedInvoice_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-POSTED",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            PostedAtUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.UpdateAsync(invoiceId, new UpdateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-POSTED",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_WithPaymentTerm_SetsDueDateFromTerm()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.PaymentTerms.Add(new PaymentTerm { Id = termId, TenantId = tenantId, Code = "NET15", Name = "Net 15", DaysDue = 15 });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-TERM",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 4, 5),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.UpdateAsync(invoiceId, new UpdateSalesInvoiceRequest
        {
            InvoiceNumber = "SI-TERM",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 10),
            DueDate = new DateOnly(2026, 4, 12),
            PaymentTermId = termId,
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.Equal(new DateOnly(2026, 4, 25), result.Value!.DueDate);
    }

    [Fact]
    public async Task Delete_NonDraftInvoice_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-REVERSED",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Cancelled,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.DeleteAsync(invoiceId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task AddLine_RecalculatesInvoiceTotals()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-003",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        var lineService = new SalesInvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await lineService.CreateAsync(invoiceId, new CreateSalesInvoiceLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitPrice = 10m,
            DiscountAmount = 0m,
            TaxAmount = 4.50m,
        });

        Assert.True(result.Succeeded);
        var invoice = dbContext.SalesInvoices.Single(x => x.Id == invoiceId);
        Assert.Equal(30m, invoice.Subtotal);
        Assert.Equal(4.50m, invoice.TaxTotal);
        Assert.Equal(34.50m, invoice.GrandTotal);
    }

    [Fact]
    public async Task AddLine_ToPostedInvoice_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-004",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            PostedAtUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var lineService = new SalesInvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await lineService.CreateAsync(invoiceId, new CreateSalesInvoiceLineRequest
        {
            ProductId = productId,
            Quantity = 1m,
            UnitPrice = 10m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ApplyPayment_UpdatesPaidTotalBalanceDueAndStatus()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-PAY",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            GrandTotal = 100m,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var partial = await service.ApplyPaymentAsync(invoiceId, 40m);
        var final = await service.ApplyPaymentAsync(invoiceId, 60m);

        Assert.True(partial.Succeeded);
        Assert.Equal(40m, partial.Value!.PaidTotal);
        Assert.Equal(60m, partial.Value.BalanceDue);
        Assert.Equal(InvoiceStatus.PartiallyPaid, partial.Value.Status);

        Assert.True(final.Succeeded);
        Assert.Equal(100m, final.Value!.PaidTotal);
        Assert.Equal(0m, final.Value.BalanceDue);
        Assert.Equal(InvoiceStatus.Paid, final.Value.Status);
    }

    [Fact]
    public async Task ApplyPayment_OverAllocation_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesInvoices.Add(new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "SI-OVER",
            CustomerId = customerId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            GrandTotal = 75m,
            PaidTotal = 50m,
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ApplyPaymentAsync(invoiceId, 30m);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Payment allocation exceeds the remaining balance.", result.ErrorMessage);
    }
}
