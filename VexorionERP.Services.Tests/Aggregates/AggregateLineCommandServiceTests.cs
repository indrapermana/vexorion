using VexorionERP.Contracts.Billing.Lines;
using VexorionERP.Contracts.Purchasing.Lines;
using VexorionERP.Contracts.Sales.Lines;
using VexorionERP.Models.Billing;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class AggregateLineCommandServiceTests
{
    [Fact]
    public async Task SalesOrderLineCreate_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            OrderNumber = "SO-1",
            OrderDate = new DateOnly(2026, 4, 16),
            RequiredDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            TotalAmount = 20m,
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 2m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(orderId, new CreateSalesOrderLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitPrice = 5m,
            DiscountAmount = 1m
        });

        Assert.True(result.Succeeded);
        Assert.Equal(34m, dbContext.SalesOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task SalesOrderLineDelete_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var lineToDeleteId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            OrderNumber = "SO-2",
            OrderDate = new DateOnly(2026, 4, 16),
            RequiredDate = new DateOnly(2026, 4, 20),
            CurrencyCode = "USD",
            TotalAmount = 34m,
            Lines =
            [
                new SalesOrderLine { Id = lineToDeleteId, TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 3m, UnitPrice = 5m, DiscountAmount = 1m },
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 2m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.DeleteAsync(orderId, lineToDeleteId);

        Assert.True(result.Succeeded);
        Assert.Equal(20m, dbContext.SalesOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task PurchaseOrderLineUpdate_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var lineId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            SupplierId = supplierId,
            OrderNumber = "PO-1",
            OrderDate = new DateOnly(2026, 4, 16),
            ExpectedReceiptDate = new DateOnly(2026, 4, 18),
            CurrencyCode = "USD",
            TotalAmount = 10m,
            Lines =
            [
                new PurchaseOrderLine { Id = lineId, TenantId = tenantId, PurchaseOrderId = orderId, ProductId = productId, Quantity = 2m, UnitCost = 5m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.UpdateAsync(orderId, lineId, new UpdatePurchaseOrderLineRequest
        {
            ProductId = productId,
            Quantity = 4m,
            UnitCost = 6m,
            IsActive = true
        });

        Assert.True(result.Succeeded);
        Assert.Equal(24m, dbContext.PurchaseOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task PurchaseOrderLineCreate_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            SupplierId = supplierId,
            OrderNumber = "PO-0",
            OrderDate = new DateOnly(2026, 4, 16),
            ExpectedReceiptDate = new DateOnly(2026, 4, 18),
            CurrencyCode = "USD",
            TotalAmount = 10m,
            Lines =
            [
                new PurchaseOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseOrderId = orderId, ProductId = productId, Quantity = 2m, UnitCost = 5m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(orderId, new CreatePurchaseOrderLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitCost = 4m
        });

        Assert.True(result.Succeeded);
        Assert.Equal(22m, dbContext.PurchaseOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task PurchaseOrderLineDelete_RecalculatesParentTotal()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var lineId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            SupplierId = supplierId,
            OrderNumber = "PO-2",
            OrderDate = new DateOnly(2026, 4, 16),
            ExpectedReceiptDate = new DateOnly(2026, 4, 18),
            CurrencyCode = "USD",
            TotalAmount = 24m,
            Lines =
            [
                new PurchaseOrderLine { Id = lineId, TenantId = tenantId, PurchaseOrderId = orderId, ProductId = productId, Quantity = 4m, UnitCost = 6m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.DeleteAsync(orderId, lineId);

        Assert.True(result.Succeeded);
        Assert.Equal(0m, dbContext.PurchaseOrders.Single().TotalAmount);
    }

    [Fact]
    public async Task InvoiceLineCreate_RecalculatesInvoiceTotals()
    {
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Invoices.Add(new Invoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            CustomerId = customerId,
            InvoiceNumber = "INV-1",
            InvoiceDate = new DateOnly(2026, 4, 16),
            DueDate = new DateOnly(2026, 4, 30),
            Status = InvoiceStatus.Draft,
            CurrencyCode = "USD",
            AmountPaid = 0m,
            Subtotal = 0m,
            TaxAmount = 0m,
            TotalAmount = 0m
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(invoiceId, new CreateInvoiceLineRequest
        {
            ProductId = productId,
            Quantity = 2m,
            UnitPrice = 12m,
            TaxAmount = 3m
        });

        Assert.True(result.Succeeded);
        var invoice = dbContext.Invoices.Single();
        Assert.Equal(24m, invoice.Subtotal);
        Assert.Equal(3m, invoice.TaxAmount);
        Assert.Equal(27m, invoice.TotalAmount);
    }

    [Fact]
    public async Task InvoiceLineDelete_RecalculatesInvoiceTotals()
    {
        var tenantId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var lineId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Invoices.Add(new Invoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            CustomerId = customerId,
            InvoiceNumber = "INV-2",
            InvoiceDate = new DateOnly(2026, 4, 16),
            DueDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            AmountPaid = 0m,
            Subtotal = 24m,
            TaxAmount = 3m,
            TotalAmount = 27m,
            Lines =
            [
                new InvoiceLine { Id = lineId, TenantId = tenantId, InvoiceId = invoiceId, ProductId = productId, Quantity = 2m, UnitPrice = 12m, TaxAmount = 3m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new InvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.DeleteAsync(invoiceId, lineId);

        Assert.True(result.Succeeded);
        var invoice = dbContext.Invoices.Single();
        Assert.Equal(0m, invoice.Subtotal);
        Assert.Equal(0m, invoice.TaxAmount);
        Assert.Equal(0m, invoice.TotalAmount);
    }
}