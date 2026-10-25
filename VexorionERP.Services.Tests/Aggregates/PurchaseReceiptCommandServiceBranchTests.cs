using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class PurchaseReceiptCommandServiceBranchTests
{
    private static IInventoryMovementPostingService GetMockService() => new TestMockService();

    private static (Guid tenantId, Guid orderId, Guid productId, Guid warehouseId, Guid lineId) SeedIds()
        => (Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

    // ============= CreateAsync Branch Tests =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(null), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ReceivedQuantity = 1, UnitCost = 100m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingReceiptNumber_ReturnsValidationError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ReceivedQuantity = 1, UnitCost = 100m } }
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
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest>()
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_PurchaseOrderNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = Guid.NewGuid(),
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = Guid.NewGuid(), ProductId = Guid.NewGuid(), ReceivedQuantity = 1, UnitCost = 100m } }
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
        var supplierId = Guid.NewGuid();
        
        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Cancelled,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
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
        var supplierId = Guid.NewGuid();
        
        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Completed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 10, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 1, UnitCost = 10m } }
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
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId2,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateReceiptNumber_Returns409()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 20),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "rec-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_ZeroQuantity_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 0, UnitCost = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidOrderLine_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = Guid.NewGuid(), ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_Overreceipt_Returns400()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 8, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
        };

        var result = await service.CreateAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesDraftReceipt()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var request = new CreatePurchaseReceiptRequest
        {
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Lines = new List<CreatePurchaseReceiptLineRequest> { new() { PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m } }
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
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(null), GetMockService());

        var result = await service.PostAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Post_ReceiptNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());

        var result = await service.PostAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Post_NotDraft_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var receiptId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(receiptId);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Post_OrderNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var receiptId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(receiptId);

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Post_PartialReceipt_UpdatesOrderStatusToPartiallyProcessed()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var receiptId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            IsActive = true,
            Lines = new List<PurchaseReceiptLine> { new PurchaseReceiptLine { TenantId = tenantId, PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 5, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(receiptId);

        Assert.True(result.Succeeded);

        var updatedOrder = await db.PurchaseOrders.FirstAsync(x => x.Id == orderId);
        Assert.Equal(DocumentStatus.PartiallyProcessed, updatedOrder.Status);
    }

    [Fact]
    public async Task Post_FullReceipt_UpdatesOrderStatusToCompleted()
    {
        var (tenantId, orderId, productId, warehouseId, lineId) = SeedIds();
        var receiptId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Suppliers.Add(new Supplier { Id = supplierId, TenantId = tenantId, SupplierNumber = "SUPP-1", Name = "Supplier" });
        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-1", Name = "Product 1" });

        db.PurchaseOrders.Add(new PurchaseOrder
        {
            Id = orderId,
            TenantId = tenantId,
            OrderNumber = "PO-001",
            SupplierId = supplierId,
            OrderDate = new DateOnly(2026, 4, 1),
            ExpectedReceiptDate = new DateOnly(2026, 4, 30),
            CurrencyCode = "USD",
            Status = DocumentStatus.Confirmed,
            TotalAmount = 100m,
            Lines = new List<PurchaseOrderLine> { new PurchaseOrderLine { Id = lineId, TenantId = tenantId, ProductId = productId, Quantity = 10, ReceivedQuantity = 0, UnitCost = 10m, IsActive = true } }
        });

        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = orderId,
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            IsActive = true,
            Lines = new List<PurchaseReceiptLine> { new PurchaseReceiptLine { TenantId = tenantId, PurchaseOrderLineId = lineId, ProductId = productId, ReceivedQuantity = 10, UnitCost = 10m, IsActive = true } }
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.PostAsync(receiptId);

        Assert.True(result.Succeeded);

        var updatedOrder = await db.PurchaseOrders.FirstAsync(x => x.Id == orderId);
        Assert.Equal(DocumentStatus.Completed, updatedOrder.Status);
    }

    // ============= DeleteAsync Branch Tests =============

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(null), GetMockService());

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_ReceiptNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());

        var result = await service.DeleteAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_NotDraft_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var receiptId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Completed,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.DeleteAsync(receiptId);

        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Delete_Draft_Success()
    {
        var tenantId = Guid.NewGuid();
        var receiptId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());

        db.Warehouses.Add(new Warehouse { Id = warehouseId, TenantId = tenantId, Code = "WH-1", Name = "Warehouse 1" });
        db.PurchaseReceipts.Add(new PurchaseReceipt
        {
            Id = receiptId,
            TenantId = tenantId,
            ReceiptNumber = "REC-001",
            PurchaseOrderId = Guid.NewGuid(),
            WarehouseId = warehouseId,
            ReceiptDate = new DateOnly(2026, 4, 30),
            Status = DocumentStatus.Draft,
            IsActive = true,
        });

        await db.SaveChangesAsync();

        var service = new PurchaseReceiptCommandService(db, new FixedTenantProvider(tenantId), GetMockService());
        var result = await service.DeleteAsync(receiptId);

        Assert.True(result.Succeeded);

        var deleted = await db.PurchaseReceipts.FirstAsync(x => x.Id == receiptId);
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
