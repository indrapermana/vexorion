using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class PurchaseOrderCommandServiceTests
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
}
