using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class CustomerCommandServiceTests
{
    static CustomerCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, CustomerCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new CustomerCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    [Fact]
    public async Task Create_EmptyCustomerNumber_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "", Name = "Cust" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyName_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C-001", Name = "" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateCustomerNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        db.Customers.Add(new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CustomerNumber = "C-001", Name = "Existing" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C-001", Name = "New" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesCustomer()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C-001", Name = "Acme" }, db);
        Assert.True(result.Succeeded);
        Assert.Equal(1, db.Customers.Count());
    }

    [Fact]
    public async Task Update_DuplicateCustomerNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var c1 = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = c1, TenantId = tenantId, CustomerNumber = "C-001", Name = "C1" });
        db.Customers.Add(new Customer { Id = Guid.NewGuid(), TenantId = tenantId, CustomerNumber = "C-002", Name = "C2" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(c1, new UpdateCustomerRequest { CustomerNumber = "C-002", Name = "C1", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCustomerRequest { CustomerNumber = "C-001", Name = "Valid Name", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesCustomer()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = id, TenantId = tenantId, CustomerNumber = "C-001", Name = "Old" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(id, new UpdateCustomerRequest { CustomerNumber = "C-001", Name = "New", IsActive = true }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("New", db.Customers.Single().Name);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesCustomer()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Customers.Add(new Customer { Id = id, TenantId = tenantId, CustomerNumber = "C-001", Name = "Gone" });
        await db.SaveChangesAsync();
        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Customers.Count());
    }
}

public class SupplierCommandServiceTests
{
    static SupplierCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, SupplierCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new SupplierCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    [Fact]
    public async Task Create_EmptySupplierNumber_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "", Name = "Supp" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateSupplierNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        db.Suppliers.Add(new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, SupplierNumber = "S-001", Name = "Existing" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S-001", Name = "New" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesSupplier()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateSupplierRequest { SupplierNumber = "S-001", Name = "Acme" }, db);
        Assert.True(result.Succeeded);
        Assert.Equal(1, db.Suppliers.Count());
    }

    [Fact]
    public async Task Update_DuplicateNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var s1 = Guid.NewGuid();
        db.Suppliers.Add(new Supplier { Id = s1, TenantId = tenantId, SupplierNumber = "S-001", Name = "S1" });
        db.Suppliers.Add(new Supplier { Id = Guid.NewGuid(), TenantId = tenantId, SupplierNumber = "S-002", Name = "S2" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(s1, new UpdateSupplierRequest { SupplierNumber = "S-002", Name = "S1", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateSupplierRequest { SupplierNumber = "S-001", Name = "Valid Name", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesSupplier()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Suppliers.Add(new Supplier { Id = id, TenantId = tenantId, SupplierNumber = "S-001", Name = "Old" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(id, new UpdateSupplierRequest { SupplierNumber = "S-001", Name = "New", IsActive = true }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("New", db.Suppliers.Single().Name);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesSupplier()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Suppliers.Add(new Supplier { Id = id, TenantId = tenantId, SupplierNumber = "S-001", Name = "Gone" });
        await db.SaveChangesAsync();
        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Suppliers.Count());
    }
}

public class WarehouseCommandServiceTests
{
    static WarehouseCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, WarehouseCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new WarehouseCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    [Fact]
    public async Task Create_EmptyCode_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "", Name = "Main" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        db.Warehouses.Add(new Warehouse { Id = Guid.NewGuid(), TenantId = tenantId, Code = "MAIN", Name = "Main" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "MAIN", Name = "Duplicate" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesWarehouse()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateWarehouseRequest { Code = "MAIN", Name = "Main" }, db);
        Assert.True(result.Succeeded);
        Assert.Equal(1, db.Warehouses.Count());
        Assert.Equal("MAIN", db.Warehouses.Single().Code);
    }

    [Fact]
    public async Task Update_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var w1 = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse { Id = w1, TenantId = tenantId, Code = "WH1", Name = "W1" });
        db.Warehouses.Add(new Warehouse { Id = Guid.NewGuid(), TenantId = tenantId, Code = "WH2", Name = "W2" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(w1, new UpdateWarehouseRequest { Code = "WH2", Name = "W1", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateWarehouseRequest { Code = "WH1", Name = "Main Warehouse", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesWarehouse()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse { Id = id, TenantId = tenantId, Code = "WH1", Name = "Old" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(id, new UpdateWarehouseRequest { Code = "WH1", Name = "New", IsActive = true }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("New", db.Warehouses.Single().Name);
    }

    [Fact]
    public async Task Delete_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Delete_HappyPath_DeletesWarehouse()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Warehouses.Add(new Warehouse { Id = id, TenantId = tenantId, Code = "WH1", Name = "Gone" });
        await db.SaveChangesAsync();
        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Warehouses.Count());
    }
}
