using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class SupplierCommandServiceBranchTests
{
    private static SupplierCommandService Build(Guid? tenantId)
        => new SupplierCommandService(new FixedTenantProvider(tenantId));

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingSupplierNumber_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "", Name = "Acme" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_MissingName_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S001", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_DuplicateNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Suppliers.Add(new Supplier { TenantId = tenantId, SupplierNumber = "S001", Name = "Acme", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S001", Name = "Other" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesSupplier()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= UpdateAsync =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingFields_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateSupplierRequest { SupplierNumber = "", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateSupplierRequest { SupplierNumber = "S001", Name = "Acme" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var suppId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Suppliers.Add(new Supplier { Id = suppId, TenantId = tenantId, SupplierNumber = "S001", Name = "Acme", IsActive = true });
        db.Suppliers.Add(new Supplier { TenantId = tenantId, SupplierNumber = "S002", Name = "Beta", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(suppId, new UpdateSupplierRequest { SupplierNumber = "S002", Name = "Acme" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesSupplier()
    {
        var tenantId = Guid.NewGuid();
        var suppId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Suppliers.Add(new Supplier { Id = suppId, TenantId = tenantId, SupplierNumber = "S001", Name = "Acme", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(suppId, new UpdateSupplierRequest { SupplierNumber = "S001", Name = "Acme Corp" }, db);
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
    public async Task Delete_Success_DeletesSupplier()
    {
        var tenantId = Guid.NewGuid();
        var suppId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Suppliers.Add(new Supplier { Id = suppId, TenantId = tenantId, SupplierNumber = "S001", Name = "Acme", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(suppId, db);
        Assert.True(result.Succeeded);
    }
}
