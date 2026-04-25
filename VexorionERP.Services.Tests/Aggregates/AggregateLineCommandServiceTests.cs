using VexorionERP.Contracts.Billing.Lines;
using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Contracts.Inventory.Transfers;
using VexorionERP.Contracts.Purchasing.Orders;
using VexorionERP.Contracts.Purchasing.Lines;
using VexorionERP.Contracts.Sales.Orders;
using VexorionERP.Contracts.Sales.Lines;
using VexorionERP.Models.Billing;
using VexorionERP.Models.Catalog;
using VexorionERP.Models.Enums;
using VexorionERP.Models.Inventory;
using VexorionERP.Models.Partners;
using VexorionERP.Models.Purchasing;
using VexorionERP.Models.Sales;
using VexorionERP.Services.Tests.Support;
using Xunit;

namespace VexorionERP.Services.Tests.Aggregates;

public class AggregateLineCommandServiceTests
{
    [Fact]
    public async Task PurchaseOrderComplete_PostsInboundInventoryMovement()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUP-1", Name = "Supplier" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            OrderNumber = "PO-RECV-1",
            OrderDate = new DateOnly(2026, 4, 25),
            ExpectedReceiptDate = new DateOnly(2026, 4, 26),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            TotalAmount = 25m,
            Lines =
            [
                new PurchaseOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, PurchaseOrderId = orderId, ProductId = productId, Quantity = 5m, UnitCost = 5m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new PurchaseOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdatePurchaseOrderRequest
        {
            OrderNumber = "PO-RECV-1",
            SupplierId = supplierId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            ExpectedReceiptDate = new DateOnly(2026, 4, 26),
            Status = DocumentStatus.Completed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(5m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.PurchaseReceipt, movement.MovementType);
        Assert.Equal(5m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task SalesOrderConfirm_ReservesInventory()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 10m, QuantityReserved = 0m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-RES-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-RES-1",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(10m, balance.QuantityOnHand);
        Assert.Equal(4m, balance.QuantityReserved);
        Assert.Equal(6m, balance.QuantityAvailable);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.SalesReservation, movement.MovementType);
        Assert.Equal(4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task SalesOrderConfirm_FailsWhenStockIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 3m, QuantityReserved = 0m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-RES-2",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Draft,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-RES-2",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(0, dbContext.InventoryMovements.Count());
        Assert.Equal(0m, dbContext.InventoryBalances.Single().QuantityReserved);
    }

    [Fact]
    public async Task SalesOrderComplete_ConsumesReservedInventory()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = warehouseId, QuantityOnHand = 10m, QuantityReserved = 4m });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-SHIP-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD",
            Lines =
            [
                new SalesOrderLine { Id = Guid.NewGuid(), TenantId = tenantId, SalesOrderId = orderId, ProductId = productId, Quantity = 4m, UnitPrice = 10m, DiscountAmount = 0m }
            ]
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var result = await service.UpdateAsync(orderId, new UpdateSalesOrderRequest
        {
            OrderNumber = "SO-SHIP-1",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Completed,
            CurrencyCode = "USD",
            IsActive = true,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.SalesShipment, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
        Assert.Equal(-4m, movement.QuantityReservedDelta);
    }

    [Fact]
    public async Task SalesOrderLineCreate_FailsWhenOrderIsNotDraft()
    {
        var tenantId = Guid.NewGuid();
        var orderId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderNumber = "SO-LOCK-1",
            OrderDate = new DateOnly(2026, 4, 25),
            RequiredDate = new DateOnly(2026, 4, 27),
            Status = DocumentStatus.Confirmed,
            CurrencyCode = "USD"
        });
        await dbContext.SaveChangesAsync();

        var service = new SalesOrderLineCommandService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.CreateAsync(orderId, new CreateSalesOrderLineRequest
        {
            ProductId = productId,
            Quantity = 1m,
            UnitPrice = 10m,
            DiscountAmount = 0m
        });

        Assert.False(result.Succeeded);
    }

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

    [Fact]
    public async Task InventoryAdjustmentComplete_PostsIncreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-1",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Opening correction",
            Lines =
            [
                new InventoryAdjustmentLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    InventoryAdjustmentId = adjustmentId,
                    ProductId = productId,
                    QuantityDelta = 8m,
                    UnitCost = 3m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-1",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Opening correction",
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(8m, balance.QuantityOnHand);
        Assert.Equal(0m, balance.QuantityReserved);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.InventoryAdjustmentIncrease, movement.MovementType);
        Assert.Equal(8m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task InventoryAdjustmentComplete_PostsDecreaseMovement()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = warehouseId,
            QuantityOnHand = 10m,
            QuantityReserved = 0m,
        });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-2",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Damage write-off",
            Lines =
            [
                new InventoryAdjustmentLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    InventoryAdjustmentId = adjustmentId,
                    ProductId = productId,
                    QuantityDelta = -4m,
                    UnitCost = 3m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-2",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Damage write-off",
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balance = dbContext.InventoryBalances.Single();
        Assert.Equal(6m, balance.QuantityOnHand);
        var movement = dbContext.InventoryMovements.Single();
        Assert.Equal(InventoryMovementType.InventoryAdjustmentDecrease, movement.MovementType);
        Assert.Equal(-4m, movement.QuantityOnHandDelta);
    }

    [Fact]
    public async Task StockTransferComplete_MovesStockAcrossWarehouses()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-1", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            QuantityOnHand = 12m,
            QuantityReserved = 0m,
        });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-1",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 5m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-1",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(result.Succeeded);
        var balances = dbContext.InventoryBalances.OrderBy(x => x.WarehouseId).ToList();
        Assert.Equal(2, balances.Count);
        Assert.Equal(7m, balances.Single(x => x.WarehouseId == sourceWarehouseId).QuantityOnHand);
        Assert.Equal(5m, balances.Single(x => x.WarehouseId == destinationWarehouseId).QuantityOnHand);
        var movements = dbContext.InventoryMovements.OrderBy(x => x.MovementType).ToList();
        Assert.Equal(2, movements.Count);
        Assert.Contains(movements, x => x.MovementType == InventoryMovementType.StockTransferOut && x.QuantityOnHandDelta == -5m);
        Assert.Contains(movements, x => x.MovementType == InventoryMovementType.StockTransferIn && x.QuantityOnHandDelta == 5m);
    }

    [Fact]
    public async Task StockTransferComplete_FailsWhenSourceStockIsInsufficient()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-2", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.Add(new InventoryBalance
        {
            TenantId = tenantId,
            ProductId = productId,
            WarehouseId = sourceWarehouseId,
            QuantityOnHand = 2m,
            QuantityReserved = 0m,
        });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-2",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 5m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-2",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(0, dbContext.InventoryMovements.Count());
        Assert.Equal(2m, dbContext.InventoryBalances.Single().QuantityOnHand);
    }

    [Fact]
    public async Task StockTransferCancel_ReversesPostedStockMovements()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-3", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.InventoryBalances.AddRange(
            new InventoryBalance
            {
                TenantId = tenantId,
                ProductId = productId,
                WarehouseId = sourceWarehouseId,
                QuantityOnHand = 12m,
                QuantityReserved = 0m,
            },
            new InventoryBalance
            {
                TenantId = tenantId,
                ProductId = productId,
                WarehouseId = destinationWarehouseId,
                QuantityOnHand = 0m,
                QuantityReserved = 0m,
            });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    StockTransferId = transferId,
                    ProductId = productId,
                    Quantity = 4m,
                    UnitCost = 2m,
                },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));

        var completeResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Notes = null,
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-3",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Notes = null,
        });

        Assert.True(cancelResult.Succeeded);
        var sourceBalance = dbContext.InventoryBalances.Single(x => x.WarehouseId == sourceWarehouseId);
        var destinationBalance = dbContext.InventoryBalances.Single(x => x.WarehouseId == destinationWarehouseId);
        Assert.Equal(12m, sourceBalance.QuantityOnHand);
        Assert.Equal(0m, destinationBalance.QuantityOnHand);
        Assert.Equal(4, dbContext.InventoryMovements.Count());
    }

    [Fact]
    public async Task InventoryAdjustmentComplete_FailsWithoutActiveLines()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-NO-LINES",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Cycle count",
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-NO-LINES",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Cycle count",
        });

        Assert.False(result.Succeeded);
        Assert.Empty(dbContext.InventoryMovements);
    }

    [Fact]
    public async Task InventoryAdjustmentCancel_FailsWhenWarehouseChangesAfterPosting()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var originalWarehouseId = Guid.NewGuid();
        var alternateWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-LOCK", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = originalWarehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" },
            new Warehouse { Id = alternateWarehouseId, TenantId = tenantId, Code = "ALT", Name = "Alternate Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = originalWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Reason = "Lock warehouse",
            Lines =
            [
                new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, InventoryAdjustmentId = adjustmentId, ProductId = productId, QuantityDelta = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var completeResult = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = originalWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
            Reason = "Lock warehouse",
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(adjustmentId, new UpdateInventoryAdjustmentRequest
        {
            AdjustmentNumber = "ADJ-LOCK",
            WarehouseId = alternateWarehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
            Reason = "Lock warehouse",
        });

        Assert.False(cancelResult.Succeeded);
    }

    [Fact]
    public async Task StockTransferComplete_FailsWithoutActiveLines()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-NO-LINES",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var result = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-NO-LINES",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
        });

        Assert.False(result.Succeeded);
        Assert.Empty(dbContext.InventoryMovements);
    }

    [Fact]
    public async Task StockTransferCancel_FailsWhenWarehousesChangeAfterPosting()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var alternateWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-LOCK", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" },
            new Warehouse { Id = alternateWarehouseId, TenantId = tenantId, Code = "ALT", Name = "Alternate" });
        dbContext.InventoryBalances.Add(new InventoryBalance { TenantId = tenantId, ProductId = productId, WarehouseId = sourceWarehouseId, QuantityOnHand = 10m, QuantityReserved = 0m });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine { Id = Guid.NewGuid(), TenantId = tenantId, StockTransferId = transferId, ProductId = productId, Quantity = 3m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferCommandService(dbContext, new FixedTenantProvider(tenantId), new InventoryMovementPostingService(dbContext));
        var completeResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Completed,
        });

        Assert.True(completeResult.Succeeded);

        var cancelResult = await service.UpdateAsync(transferId, new UpdateStockTransferRequest
        {
            TransferNumber = "TR-LOCK",
            SourceWarehouseId = alternateWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Cancelled,
        });

        Assert.False(cancelResult.Succeeded);
    }

    [Fact]
    public async Task InventoryAdjustmentLineCreate_FailsForDuplicateActiveProduct()
    {
        var tenantId = Guid.NewGuid();
        var adjustmentId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-ADJ-DUP", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "MAIN", Name = "Main Warehouse" });
        dbContext.InventoryAdjustments.Add(new InventoryAdjustment
        {
            Id = adjustmentId,
            TenantId = tenantId,
            AdjustmentNumber = "ADJ-DUP-LINE",
            WarehouseId = warehouseId,
            AdjustmentDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new InventoryAdjustmentLine { Id = Guid.NewGuid(), TenantId = tenantId, InventoryAdjustmentId = adjustmentId, ProductId = productId, QuantityDelta = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new InventoryAdjustmentLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(adjustmentId, new CreateInventoryAdjustmentLineRequest
        {
            ProductId = productId,
            QuantityDelta = 3m,
            UnitCost = 1m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(1, dbContext.InventoryAdjustmentLines.Count());
    }

    [Fact]
    public async Task StockTransferLineCreate_FailsForDuplicateActiveProduct()
    {
        var tenantId = Guid.NewGuid();
        var transferId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var sourceWarehouseId = Guid.NewGuid();
        var destinationWarehouseId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();

        await using var dbContext = TestDbContextFactory.Create(tenantId, databaseName);
        dbContext.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "P-TR-DUP", Name = "Product", UnitOfMeasure = "EA" });
        dbContext.Warehouses.AddRange(
            new Warehouse { Id = sourceWarehouseId, TenantId = tenantId, Code = "SRC", Name = "Source" },
            new Warehouse { Id = destinationWarehouseId, TenantId = tenantId, Code = "DST", Name = "Destination" });
        dbContext.StockTransfers.Add(new StockTransfer
        {
            Id = transferId,
            TenantId = tenantId,
            TransferNumber = "TR-DUP-LINE",
            SourceWarehouseId = sourceWarehouseId,
            DestinationWarehouseId = destinationWarehouseId,
            TransferDate = new DateOnly(2026, 4, 25),
            Status = DocumentStatus.Draft,
            Lines =
            [
                new StockTransferLine { Id = Guid.NewGuid(), TenantId = tenantId, StockTransferId = transferId, ProductId = productId, Quantity = 2m, UnitCost = 1m },
            ],
        });
        await dbContext.SaveChangesAsync();

        var service = new StockTransferLineCommandService(dbContext, new FixedTenantProvider(tenantId));
        var result = await service.CreateAsync(transferId, new CreateStockTransferLineRequest
        {
            ProductId = productId,
            Quantity = 3m,
            UnitCost = 1m,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(1, dbContext.StockTransferLines.Count());
    }
}