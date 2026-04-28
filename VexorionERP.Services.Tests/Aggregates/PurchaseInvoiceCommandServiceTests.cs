using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class PurchaseInvoiceCommandServiceTests
{
    [Fact]
    public async Task Create_WithValidRequest_ReturnsDraftInvoiceWithZeroTotals()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-001",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal("PI-001", result.Value.InvoiceNumber);
        Assert.Equal(0m, result.Value.Subtotal);
        Assert.Equal(0m, result.Value.GrandTotal);
        Assert.Equal(InvoiceStatus.Draft, result.Value.Status);
    }

    [Fact]
    public async Task Create_WithAutoInvoiceNumber_GeneratesNumberFromSequence()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-AUTO", Name = "Supplier" });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "AUTO",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.StartsWith("PI-202604-", result.Value!.InvoiceNumber);
    }

    [Fact]
    public async Task Create_WithPaymentTerm_SetsDueDateFromTerm()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PaymentTerms.Add(new PaymentTerm { Id = termId, TenantId = tenantId, Code = "NET45", Name = "Net 45", DaysDue = 45 });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-002",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 4, 1), // should be overridden
            PaymentTermId = termId,
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.Equal(new DateOnly(2026, 5, 16), result.Value!.DueDate);
    }

    [Fact]
    public async Task Create_FromPurchaseOrder_CopiesLinesAndTotals()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var purchaseOrderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main warehouse" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = purchaseOrderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 12),
            CurrencyCode = "usd",
            Status = DocumentStatus.Confirmed,
            Lines =
            [
                new PurchaseOrderLine
                {
                    TenantId = tenantId,
                    ProductId = productId,
                    Quantity = 4m,
                    UnitCost = 12.5m,
                }
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-SOURCE",
            SupplierId = Guid.Empty,
            SourcePurchaseOrderId = purchaseOrderId,
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = string.Empty,
        });

        Assert.True(result.Succeeded);
        Assert.Equal(supplierId, result.Value!.SupplierId);
        Assert.Equal("USD", result.Value.CurrencyCode);
        Assert.Equal(purchaseOrderId, result.Value.SourcePurchaseOrderId);
        Assert.Equal(50m, result.Value.Subtotal);
        Assert.Equal(50m, result.Value.GrandTotal);

        var lines = dbContext.PurchaseInvoiceLines.Where(x => x.PurchaseInvoiceId == result.Value.Id).ToList();
        Assert.Single(lines);
        Assert.Equal(productId, lines[0].ProductId);
        Assert.Equal(4m, lines[0].Quantity);
        Assert.Equal(12.5m, lines[0].UnitCost);
    }

    [Fact]
    public async Task Create_DuplicateInvoiceNumber_ReturnsConflict()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            InvoiceNumber = "PI-DUP",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(new CreatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-DUP",
            SupplierId = supplierId,
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
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-POSTED",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            PostedAtUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.UpdateAsync(invoiceId, new UpdatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-POSTED",
            SupplierId = supplierId,
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
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var termId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PaymentTerms.Add(new PaymentTerm { Id = termId, TenantId = tenantId, Code = "NET20", Name = "Net 20", DaysDue = 20 });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-TERM",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 4, 5),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.UpdateAsync(invoiceId, new UpdatePurchaseInvoiceRequest
        {
            InvoiceNumber = "PI-TERM",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 10),
            DueDate = new DateOnly(2026, 4, 12),
            PaymentTermId = termId,
            CurrencyCode = "USD",
        });

        Assert.True(result.Succeeded);
        Assert.Equal(new DateOnly(2026, 4, 30), result.Value!.DueDate);
    }

    [Fact]
    public async Task Delete_NonDraftInvoice_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-REVERSED",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Cancelled,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.DeleteAsync(invoiceId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task AddLine_RecalculatesInvoiceTotals()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-003",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
        });
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        var lineService = new PurchaseInvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await lineService.CreateAsync(invoiceId, new CreatePurchaseInvoiceLineRequest
        {
            ProductId = productId,
            Quantity = 5m,
            UnitCost = 8m,
            DiscountAmount = 2m,
            TaxAmount = 1.90m,
        });

        Assert.True(result.Succeeded);
        var invoice = dbContext.PurchaseInvoices.Single(x => x.Id == invoiceId);
        Assert.Equal(38m, invoice.Subtotal); // (5 * 8) - 2
        Assert.Equal(1.90m, invoice.TaxTotal);
        Assert.Equal(39.90m, invoice.GrandTotal);
    }

    [Fact]
    public async Task AddLine_ToPostedInvoice_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "PROD-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-004",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            PostedAtUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        var lineService = new PurchaseInvoiceLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await lineService.CreateAsync(invoiceId, new CreatePurchaseInvoiceLineRequest
        {
            ProductId = productId,
            Quantity = 1m,
            UnitCost = 10m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task ApplyPayment_UpdatesPaidTotalBalanceDueAndStatus()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-PAY",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            GrandTotal = 80m,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var partial = await service.ApplyPaymentAsync(invoiceId, 30m);
        var final = await service.ApplyPaymentAsync(invoiceId, 50m);

        Assert.True(partial.Succeeded);
        Assert.Equal(30m, partial.Value!.PaidTotal);
        Assert.Equal(50m, partial.Value.BalanceDue);
        Assert.Equal(InvoiceStatus.PartiallyPaid, partial.Value.Status);

        Assert.True(final.Succeeded);
        Assert.Equal(80m, final.Value!.PaidTotal);
        Assert.Equal(0m, final.Value.BalanceDue);
        Assert.Equal(InvoiceStatus.Paid, final.Value.Status);
    }

    [Fact]
    public async Task ApplyPayment_OverAllocation_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.PurchaseInvoices.Add(new PurchaseInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            InvoiceNumber = "PI-OVER",
            SupplierId = supplierId,
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            GrandTotal = 120m,
            PaidTotal = 100m,
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseInvoiceCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.ApplyPaymentAsync(invoiceId, 25m);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("Payment allocation exceeds the remaining balance.", result.ErrorMessage);
    }
}
