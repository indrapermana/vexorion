using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class InvoiceLineCommandServiceTests
{
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
