using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class SalesShipmentCommandServiceBranchTests
{
    private static IInventoryMovementPostingService GetMockService() => new TestMockService();

    private static (Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId) SeedIds()
        => (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    // ============= CreateAsync Branch Tests =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(null), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ShippedQuantity = 1, UnitPrice = 100m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingShipmentNumber_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ShippedQuantity = 1, UnitPrice = 100m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_NoLines_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest>()
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_SalesOrderNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ShippedQuantity = 1, UnitPrice = 100m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_CancelledOrder_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var customerId = Guid.NewGuid();
        
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Cancelled,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_CompletedOrder_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var customerId = Guid.NewGuid();
        
        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Completed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 10, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 1, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_WarehouseNotFound_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var warehouseId2 = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = Guid.NewGuid(),
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId2,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateShipmentNumber_Returns409()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        db.SalesShipments.Add(new SalesShipment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "ship-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_ZeroQuantity_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 0, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidOrderLine_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = Guid.NewGuid(), ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_Overship_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 8, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesDraftShipment()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreateSalesShipmentRequest
        {
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreateSalesShipmentLineRequest> { new() { SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.True(result.Succeeded);
        Assert.Equal(DocumentStatus.Draft, result.Value!.Status);
    }

    // ============= PostAsync Branch Tests =============

    [Fact]
    public async Task Post_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(null), GetMockService());

        var result = await service.PostAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Post_ShipmentNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());

        var result = await service.PostAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Post_NotDraft_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var shipmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed,
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(shipmentId);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Post_OrderNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var shipmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(shipmentId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Post_PartialShip_UpdatesOrderStatusToPartiallyProcessed()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var shipmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            Lines = new List<SalesShipmentLine> { new SalesShipmentLine { TenantId = tenantId, SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 5, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(shipmentId);

        Assert.True(result.Succeeded);

        var updatedOrder = await db.SalesOrders.FirstAsync(x => x.Id == orderId);
        Assert.Equal(DocumentStatus.PartiallyProcessed, updatedOrder.Status);
    }

    [Fact]
    public async Task Post_FullShip_UpdatesOrderStatusToCompleted()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var shipmentId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Customers.Add(new Customer { Id = customerId, TenantId = tenantId, CustomerNumber = "CUST-1", Name = "Customer" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.SalesOrders.Add(new SalesOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "SO-001",
            CustomerId = customerId,
            WarehouseId = warehouseId,
            OrderDate = new DateOnly(2026, 4, 1),
            RequiredDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<SalesOrderLine> { new SalesOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ShippedQuantity = 0, UnitPrice = 10m, IsActive = true } }
        });

        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = orderId,
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            Lines = new List<SalesShipmentLine> { new SalesShipmentLine { TenantId = tenantId, SalesOrderLineId = lineId, ProductId = productId, ShippedQuantity = 10, UnitPrice = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(shipmentId);

        Assert.True(result.Succeeded);

        var updatedOrder = await db.SalesOrders.FirstAsync(x => x.Id == orderId);
        Assert.Equal(DocumentStatus.Completed, updatedOrder.Status);
    }

    // ============= DeleteAsync Branch Tests =============

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(null), GetMockService());

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_ShipmentNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_NotDraft_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var shipmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed,
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.DeleteAsync(shipmentId);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Delete_Draft_Success()
    {
        var tenantId = Guid.NewGuid();
        var shipmentId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.SalesShipments.Add(new SalesShipment
        {
            Id = shipmentId,
            TenantId = tenantId,
            ShipmentNumber = "SHIP-001",
            SalesOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ShipmentDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new SalesShipmentCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.DeleteAsync(shipmentId);

        Assert.True(result.Succeeded);

        var deleted = await db.SalesShipments.FirstAsync(x => x.Id == shipmentId);
        Assert.False(deleted.IsActive);
    }

    // ============= Helper Methods =============

    private class TestMockService : IInventoryMovementPostingService
    {
        public Task<ServiceResult<bool>> ApplyPurchaseOrderStatusChangeAsync(PurchaseOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplySalesOrderStatusChangeAsync(SalesOrder order, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyInventoryAdjustmentStatusChangeAsync(InventoryAdjustment adjustment, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyStockTransferStatusChangeAsync(StockTransfer transfer, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyStockCountStatusChangeAsync(StockCount stockCount, DocumentStatus previousStatus, DocumentStatus newStatus, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplyPurchaseReceiptAsync(PurchaseReceipt receipt, string purchaseOrderNumber, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));

        public Task<ServiceResult<bool>> ApplySalesShipmentAsync(SalesShipment shipment, string salesOrderNumber, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<bool>.Success(true));
    }
}
