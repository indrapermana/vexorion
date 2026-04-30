using Microsoft.AspNetCore.Http;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class ProductPurchasePriceHistoryQueryServiceTests
{
    [Fact]
    public async Task GetLatestBySupplierAsync_ReturnsLatestPerSupplier_ExcludingDraftAndCancelled()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"product-price-history-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "PRD-001",
            Name = "Widget",
            UnitOfMeasure = "EA",
            IsActive = true,
        };

        var supplierA = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-A",
            Name = "Supplier A",
            IsActive = true,
        };

        var supplierB = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-B",
            Name = "Supplier B",
            IsActive = true,
        };

        dbContext.Products.Add(product);
        dbContext.Suppliers.AddRange(supplierA, supplierB);

        var piAOld = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A-OLD",
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        var piANewDraft = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A-DRAFT",
            InvoiceDate = new DateOnly(2026, 4, 20),
            DueDate = new DateOnly(2026, 5, 20),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Draft,
            IsActive = true,
        };

        var piANewValid = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A-NEW",
            InvoiceDate = new DateOnly(2026, 4, 25),
            DueDate = new DateOnly(2026, 5, 25),
            CurrencyCode = "USD",
            Status = InvoiceStatus.PartiallyPaid,
            IsActive = true,
        };

        var piBCancelled = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierB.Id,
            InvoiceNumber = "PI-B-CANCELLED",
            InvoiceDate = new DateOnly(2026, 4, 18),
            DueDate = new DateOnly(2026, 5, 18),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Cancelled,
            IsActive = true,
        };

        var piBValid = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierB.Id,
            InvoiceNumber = "PI-B-VALID",
            InvoiceDate = new DateOnly(2026, 4, 22),
            DueDate = new DateOnly(2026, 5, 22),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        dbContext.PurchaseInvoices.AddRange(piAOld, piANewDraft, piANewValid, piBCancelled, piBValid);

        dbContext.PurchaseInvoiceLines.AddRange(
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = piAOld.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 100m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = piANewDraft.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 999m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = piANewValid.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 120m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = piBCancelled.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 888m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = piBValid.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 210m,
                IsActive = true,
            });

        await dbContext.SaveChangesAsync();

        var service = new ProductPurchasePriceHistoryQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetLatestBySupplierAsync(product.Id);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value.Count);

        var supplierAResult = result.Value.Single(x => x.SupplierId == supplierA.Id);
        Assert.Equal("PI-A-NEW", supplierAResult.InvoiceNumber);
        Assert.Equal(120m, supplierAResult.LatestUnitCost);

        var supplierBResult = result.Value.Single(x => x.SupplierId == supplierB.Id);
        Assert.Equal("PI-B-VALID", supplierBResult.InvoiceNumber);
        Assert.Equal(210m, supplierBResult.LatestUnitCost);
    }

    [Fact]
    public async Task GetLatestBySupplierAsync_WithoutTenantContext_Returns400()
    {
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), $"product-price-history-no-tenant-{Guid.NewGuid()}");
        var service = new ProductPurchasePriceHistoryQueryService(dbContext, new FixedTenantProvider(null));

        var result = await service.GetLatestBySupplierAsync(Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task GetHistoryAsync_AppliesSupplierAndDateFilters()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"product-price-history-filters-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "PRD-FLT",
            Name = "Filter Product",
            UnitOfMeasure = "EA",
            IsActive = true,
        };

        var supplierA = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-A",
            Name = "Supplier A",
            IsActive = true,
        };

        var supplierB = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-B",
            Name = "Supplier B",
            IsActive = true,
        };

        dbContext.Products.Add(product);
        dbContext.Suppliers.AddRange(supplierA, supplierB);

        var invA = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A",
            InvoiceDate = new DateOnly(2026, 4, 10),
            DueDate = new DateOnly(2026, 5, 10),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        var invB = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierB.Id,
            InvoiceNumber = "PI-B",
            InvoiceDate = new DateOnly(2026, 4, 20),
            DueDate = new DateOnly(2026, 5, 20),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        dbContext.PurchaseInvoices.AddRange(invA, invB);

        dbContext.PurchaseInvoiceLines.AddRange(
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = invA.Id,
                ProductId = product.Id,
                Quantity = 3m,
                UnitCost = 50m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = invB.Id,
                ProductId = product.Id,
                Quantity = 2m,
                UnitCost = 70m,
                IsActive = true,
            });

        await dbContext.SaveChangesAsync();

        var service = new ProductPurchasePriceHistoryQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetHistoryAsync(
            product.Id,
            supplierId: supplierB.Id,
            fromDate: new DateOnly(2026, 4, 15),
            toDate: new DateOnly(2026, 4, 30));

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Single(result.Value);
        Assert.Equal("PI-B", result.Value.Single().InvoiceNumber);
        Assert.Equal(70m, result.Value.Single().UnitCost);
    }

    [Fact]
    public async Task GetHistoryAsync_WhenDateRangeInvalid_Returns400()
    {
        await using var dbContext = TestDbContextFactory.Create(Guid.NewGuid(), $"product-price-history-invalid-range-{Guid.NewGuid()}");
        var service = new ProductPurchasePriceHistoryQueryService(dbContext, new FixedTenantProvider(Guid.NewGuid()));

        var result = await service.GetHistoryAsync(
            Guid.NewGuid(),
            fromDate: new DateOnly(2026, 4, 30),
            toDate: new DateOnly(2026, 4, 1));

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task GetSupplierSummaryAsync_ComputesStatsPerSupplier()
    {
        var tenantId = Guid.NewGuid();
        var dbName = $"product-price-summary-{Guid.NewGuid()}";

        await using var dbContext = TestDbContextFactory.Create(tenantId, dbName);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "PRD-SUM",
            Name = "Summary Product",
            UnitOfMeasure = "EA",
            IsActive = true,
        };

        var supplierA = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-A",
            Name = "Supplier A",
            IsActive = true,
        };

        var supplierB = new Supplier
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierNumber = "SUP-B",
            Name = "Supplier B",
            IsActive = true,
        };

        dbContext.Products.Add(product);
        dbContext.Suppliers.AddRange(supplierA, supplierB);

        var invA1 = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A-1",
            InvoiceDate = new DateOnly(2026, 4, 1),
            DueDate = new DateOnly(2026, 5, 1),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        var invA2 = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierA.Id,
            InvoiceNumber = "PI-A-2",
            InvoiceDate = new DateOnly(2026, 4, 15),
            DueDate = new DateOnly(2026, 5, 15),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        var invB1 = new PurchaseInvoice
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            SupplierId = supplierB.Id,
            InvoiceNumber = "PI-B-1",
            InvoiceDate = new DateOnly(2026, 4, 10),
            DueDate = new DateOnly(2026, 5, 10),
            CurrencyCode = "USD",
            Status = InvoiceStatus.Issued,
            IsActive = true,
        };

        dbContext.PurchaseInvoices.AddRange(invA1, invA2, invB1);

        dbContext.PurchaseInvoiceLines.AddRange(
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = invA1.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 100m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = invA2.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 130m,
                IsActive = true,
            },
            new PurchaseInvoiceLine
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                PurchaseInvoiceId = invB1.Id,
                ProductId = product.Id,
                Quantity = 1m,
                UnitCost = 80m,
                IsActive = true,
            });

        await dbContext.SaveChangesAsync();

        var service = new ProductPurchasePriceHistoryQueryService(dbContext, new FixedTenantProvider(tenantId));

        var result = await service.GetSupplierSummaryAsync(product.Id);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value.Count);

        var a = result.Value.Single(x => x.SupplierId == supplierA.Id);
        Assert.Equal(2, a.PurchaseCount);
        Assert.Equal(100m, a.MinUnitCost);
        Assert.Equal(130m, a.MaxUnitCost);
        Assert.Equal(115m, a.AvgUnitCost);
        Assert.Equal(130m, a.LatestUnitCost);
        Assert.Equal(new DateOnly(2026, 4, 15), a.LastPurchaseDate);
        Assert.Equal("PI-A-2", a.LatestInvoiceNumber);

        var b = result.Value.Single(x => x.SupplierId == supplierB.Id);
        Assert.Equal(1, b.PurchaseCount);
        Assert.Equal(80m, b.MinUnitCost);
        Assert.Equal(80m, b.MaxUnitCost);
        Assert.Equal(80m, b.AvgUnitCost);
        Assert.Equal(80m, b.LatestUnitCost);
        Assert.Equal(new DateOnly(2026, 4, 10), b.LastPurchaseDate);
    }
}

