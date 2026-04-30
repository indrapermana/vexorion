using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class WarehouseCommandServiceBranchTests
{
    private static WarehouseCommandService Build(Guid? tenantId)
        => new WarehouseCommandService(new FixedTenantProvider(tenantId));

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "WH01", Name = "Main" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingCode_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "", Name = "Main" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_MissingName_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "WH01", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Warehouses.Add(new Warehouse { TenantId = tenantId, Code = "WH01", Name = "Main", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "WH01", Name = "Other" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesWarehouse()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "WH01", Name = "Main Warehouse" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= UpdateAsync =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateWarehouseRequest { Code = "WH01", Name = "Main" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingFields_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateWarehouseRequest { Code = "", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateWarehouseRequest { Code = "WH01", Name = "Main" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var whId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Warehouses.Add(new Warehouse { Id = whId, TenantId = tenantId, Code = "WH01", Name = "Main", IsActive = true });
        db.Warehouses.Add(new Warehouse { TenantId = tenantId, Code = "WH02", Name = "Secondary", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(whId, new UpdateWarehouseRequest { Code = "WH02", Name = "Main" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesWarehouse()
    {
        var tenantId = Guid.NewGuid();
        var whId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Warehouses.Add(new Warehouse { Id = whId, TenantId = tenantId, Code = "WH01", Name = "Main", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(whId, new UpdateWarehouseRequest { Code = "WH01", Name = "Main Updated" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= DeleteAsync =============

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_Success_DeletesWarehouse()
    {
        var tenantId = Guid.NewGuid();
        var whId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Warehouses.Add(new Warehouse { Id = whId, TenantId = tenantId, Code = "WH01", Name = "Main", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(whId, db);
        Assert.True(result.Succeeded);
    }
}
