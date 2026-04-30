using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class CustomerCommandServiceBranchTests
{
    private static CustomerCommandService Build(Guid? tenantId)
        => new CustomerCommandService(new FixedTenantProvider(tenantId));

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingCustomerNumber_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "", Name = "Alice" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_MissingName_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C001", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_DuplicateNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Customers.Add(new Customer { TenantId = tenantId, CustomerNumber = "C001", Name = "Alice", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C001", Name = "Bob" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesCustomer()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= UpdateAsync =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingFields_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCustomerRequest { CustomerNumber = "", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCustomerRequest { CustomerNumber = "C001", Name = "Alice" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var custId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Customers.Add(new Customer { Id = custId, TenantId = tenantId, CustomerNumber = "C001", Name = "Alice", IsActive = true });
        db.Customers.Add(new Customer { TenantId = tenantId, CustomerNumber = "C002", Name = "Bob", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(custId, new UpdateCustomerRequest { CustomerNumber = "C002", Name = "Alice" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesCustomer()
    {
        var tenantId = Guid.NewGuid();
        var custId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Customers.Add(new Customer { Id = custId, TenantId = tenantId, CustomerNumber = "C001", Name = "Alice", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(custId, new UpdateCustomerRequest { CustomerNumber = "C001", Name = "Alice Updated" }, db);
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
    public async Task Delete_Success_DeletesCustomer()
    {
        var tenantId = Guid.NewGuid();
        var custId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Customers.Add(new Customer { Id = custId, TenantId = tenantId, CustomerNumber = "C001", Name = "Alice", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(custId, db);
        Assert.True(result.Succeeded);
    }
}
