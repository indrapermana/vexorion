using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

/// <summary>
/// Covers BaseCommandService (Create/Update/Delete branches) and
/// BaseQueryService (GetAll/GetById branches) via ProductCommandService
/// and ProductQueryService.
/// </summary>
public class ProductCrudTests
{
    static ProductCrudTests() => MapsterTestConfiguration.Configure();

    // ── helpers ────────────────────────────────────────────────────────────

    private static (AppDbContext db, ProductCommandService cmd, ProductQueryService qry) Build(
        Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var provider = new FixedTenantProvider(tid);
        var cmd = new ProductCommandService(provider, new NoOpProductImageStorageService());
        var qry = new ProductQueryService(provider);
        return (db, cmd, qry);
    }

    private static (AppDbContext db, ProductCommandService cmd, ProductQueryService qry) BuildNoTenant(string? dbName = null)
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), dbName ?? Guid.NewGuid().ToString());
        var provider = new FixedTenantProvider(null);
        var cmd = new ProductCommandService(provider, new NoOpProductImageStorageService());
        var qry = new ProductQueryService(provider);
        return (db, cmd, qry);
    }

    private static CreateProductRequest ValidCreate(string sku = "SKU-001") => new()
    {
        Sku = sku,
        Name = "Widget",
        UnitOfMeasure = "EA",
        StandardCost = 5m,
        SalesPrice = 10m,
    };

    private static UpdateProductRequest ValidUpdate(string sku = "SKU-001") => new()
    {
        Sku = sku,
        Name = "Widget Updated",
        UnitOfMeasure = "EA",
        StandardCost = 6m,
        SalesPrice = 12m,
        IsActive = true,
    };

    private sealed class NoOpProductImageStorageService : IProductImageStorageService
    {
        public Task<ProductImageUploadResult> UploadAsync(Guid tenantId, Guid productId, Stream content, string contentType, string originalFileName, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task DeleteAsync(string? imageUrl, string? thumbnailUrl, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class RecordingProductImageStorageService : IProductImageStorageService
    {
        public bool FailDelete { get; init; }
        public (string? ImageUrl, string? ThumbnailUrl)? Deleted { get; private set; }

        public Task<ProductImageUploadResult> UploadAsync(Guid tenantId, Guid productId, Stream content, string contentType, string originalFileName, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task DeleteAsync(string? imageUrl, string? thumbnailUrl, CancellationToken cancellationToken = default)
        {
            Deleted = (imageUrl, thumbnailUrl);
            return FailDelete ? Task.FromException(new IOException("storage unavailable")) : Task.CompletedTask;
        }
    }

    // ── Create ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var (db, cmd, _) = BuildNoTenant();
        var result = await cmd.CreateAsync(ValidCreate(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_EmptySku_ReturnsValidationError()
    {
        var (db, cmd, _) = Build();
        var req = ValidCreate();
        req.Sku = "";
        var result = await cmd.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyName_ReturnsValidationError()
    {
        var (db, cmd, _) = Build();
        var req = ValidCreate();
        req.Name = "";
        var result = await cmd.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateSku_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, cmd, _) = Build(tenantId, dbName);

        // Pre-seed a product with the same SKU
        db.Products.Add(new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "SKU-001",
            Name = "Existing",
            UnitOfMeasure = "EA",
        });
        await db.SaveChangesAsync();

        var result = await cmd.CreateAsync(ValidCreate("SKU-001"), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_ReturnsProduct()
    {
        var (db, cmd, _) = Build();
        var result = await cmd.CreateAsync(ValidCreate(), db);
        Assert.True(result.Succeeded);
        Assert.Equal(1, db.Products.Count());
    }

    [Fact]
    public async Task Create_NullRequest_Throws()
    {
        var (db, cmd, _) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => cmd.CreateAsync(null!, db));
    }

    [Fact]
    public async Task Create_NullDbContext_Throws()
    {
        var (_, cmd, _) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => cmd.CreateAsync(ValidCreate(), null!));
    }

    // ── Update ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var (db, cmd, _) = BuildNoTenant();
        var result = await cmd.UpdateAsync(Guid.NewGuid(), ValidUpdate(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Update_EmptySku_ReturnsValidationError()
    {
        var (db, cmd, _) = Build();
        var req = ValidUpdate();
        req.Sku = "";
        var result = await cmd.UpdateAsync(Guid.NewGuid(), req, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, cmd, _) = Build();
        var result = await cmd.UpdateAsync(Guid.NewGuid(), ValidUpdate(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateSku_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, cmd, _) = Build(tenantId, dbName);

        var p1Id = Guid.NewGuid();
        db.Products.Add(new Product { Id = p1Id, TenantId = tenantId, Sku = "SKU-001", Name = "P1", UnitOfMeasure = "EA" });
        db.Products.Add(new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "SKU-002", Name = "P2", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        // Try to rename p1 to SKU-002 (already taken)
        var result = await cmd.UpdateAsync(p1Id, ValidUpdate("SKU-002"), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesProduct()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, cmd, _) = Build(tenantId, dbName);

        var productId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Original", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        var result = await cmd.UpdateAsync(productId, ValidUpdate("SKU-001"), db);
        Assert.True(result.Succeeded);
        Assert.Equal("Widget Updated", db.Products.Single().Name);
    }

    [Fact]
    public async Task Update_NullRequest_Throws()
    {
        var (db, cmd, _) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => cmd.UpdateAsync(Guid.NewGuid(), null!, db));
    }

    [Fact]
    public async Task Update_NullDbContext_Throws()
    {
        var (_, cmd, _) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => cmd.UpdateAsync(Guid.NewGuid(), ValidUpdate(), null!));
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var (db, cmd, _) = BuildNoTenant();
        var result = await cmd.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, cmd, _) = Build();
        var result = await cmd.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesProduct()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, cmd, _) = Build(tenantId, dbName);

        var productId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "To Delete", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        var result = await cmd.DeleteAsync(productId, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Products.Count());
    }

    [Fact]
    public async Task Delete_WithImages_RemovesStoredImagesBeforeProduct()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var storage = new RecordingProductImageStorageService();
        var cmd = new ProductCommandService(new FixedTenantProvider(tenantId), storage);
        var productId = Guid.NewGuid();
        db.Products.Add(new Product
        {
            Id = productId,
            TenantId = tenantId,
            Sku = "SKU-IMAGE",
            Name = "Image product",
            UnitOfMeasure = "EA",
            ImageUrl = "https://images.example/full.png",
            ThumbnailUrl = "https://images.example/thumb.jpg"
        });
        await db.SaveChangesAsync();

        var result = await cmd.DeleteAsync(productId, db);

        Assert.True(result.Succeeded);
        Assert.Equal(("https://images.example/full.png", "https://images.example/thumb.jpg"), storage.Deleted);
        Assert.Empty(db.Products);
    }

    [Fact]
    public async Task Delete_WhenImageCleanupFails_KeepsProductAndReturnsActionableError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var storage = new RecordingProductImageStorageService { FailDelete = true };
        var cmd = new ProductCommandService(new FixedTenantProvider(tenantId), storage);
        var productId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-FAIL", Name = "Keep", UnitOfMeasure = "EA", ImageUrl = "https://images.example/full.png" });
        await db.SaveChangesAsync();

        var result = await cmd.DeleteAsync(productId, db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Contains("stored images", result.ErrorMessage);
        Assert.Single(db.Products);
    }

    [Fact]
    public async Task Delete_NullDbContext_Throws()
    {
        var (_, cmd, _) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => cmd.DeleteAsync(Guid.NewGuid(), null!));
    }

    // ── GetAll ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_NoTenantContext_Returns400()
    {
        var (db, _, qry) = BuildNoTenant();
        var result = await qry.GetAllAsync(db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task GetAll_NullDbContext_Throws()
    {
        var (_, _, qry) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => qry.GetAllAsync(null!));
    }

    [Fact]
    public async Task GetAll_EmptyTenant_ReturnsEmptyList()
    {
        var (db, _, qry) = Build();
        var result = await qry.GetAllAsync(db);
        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!);
    }

    [Fact]
    public async Task GetAll_OnlyReturnsTenantProducts()
    {
        var tenantId = Guid.NewGuid();
        var otherTenant = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, _, qry) = Build(tenantId, dbName);

        // Add one product for this tenant and one for another
        db.Products.Add(new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "MY", Name = "Mine", UnitOfMeasure = "EA" });
        db.Products.Add(new Product { Id = Guid.NewGuid(), TenantId = otherTenant, Sku = "THEIR", Name = "Theirs", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        var result = await qry.GetAllAsync(db);
        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    // ── GetById ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_NoTenantContext_Returns400()
    {
        var (db, _, qry) = BuildNoTenant();
        var result = await qry.GetByIdAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task GetById_NullDbContext_Throws()
    {
        var (_, _, qry) = Build();
        await Assert.ThrowsAsync<ArgumentNullException>(() => qry.GetByIdAsync(Guid.NewGuid(), null!));
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        var (db, _, qry) = Build();
        var result = await qry.GetByIdAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task GetById_HappyPath_ReturnsProduct()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, _, qry) = Build(tenantId, dbName);

        var productId = Guid.NewGuid();
        db.Products.Add(new Product { Id = productId, TenantId = tenantId, Sku = "SKU-001", Name = "Widget", UnitOfMeasure = "EA" });
        await db.SaveChangesAsync();

        var result = await qry.GetByIdAsync(productId, db);
        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
    }
}
