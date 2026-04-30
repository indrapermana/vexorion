using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class AccountCommandServiceBranchTests
{
    private static AccountCommandService Build(AppDbContext db, Guid? tenantId)
        => new AccountCommandService(new FixedTenantProvider(tenantId));

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(db, null);
        var result = await svc.CreateAsync(new CreateAccountRequest { Code = "1000", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingCode_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.CreateAsync(new CreateAccountRequest { Code = "", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_MissingName_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.CreateAsync(new CreateAccountRequest { Code = "1000", Name = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Accounts.Add(new Account { TenantId = tenantId, Code = "1000", Name = "Cash", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(db, tenantId);
        var result = await svc.CreateAsync(new CreateAccountRequest { Code = "1000", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesAccount()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.CreateAsync(new CreateAccountRequest { Code = "1000", Name = "Cash", AccountType = AccountType.Asset, NormalBalance = NormalBalanceType.Debit }, db);
        Assert.True(result.Succeeded);
    }

    // ============= UpdateAsync =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(db, null);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateAccountRequest { Code = "1000", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingCode_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateAccountRequest { Code = "", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_AccountNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateAccountRequest { Code = "1000", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var acctId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Accounts.Add(new Account { Id = acctId, TenantId = tenantId, Code = "1000", Name = "Cash", IsActive = true });
        db.Accounts.Add(new Account { TenantId = tenantId, Code = "2000", Name = "Revenue", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(db, tenantId);
        // Try to rename acctId to "2000" (duplicate)
        var result = await svc.UpdateAsync(acctId, new UpdateAccountRequest { Code = "2000", Name = "Cash" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesAccount()
    {
        var tenantId = Guid.NewGuid();
        var acctId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Accounts.Add(new Account { Id = acctId, TenantId = tenantId, Code = "1000", Name = "Cash", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(db, tenantId);
        var result = await svc.UpdateAsync(acctId, new UpdateAccountRequest { Code = "1001", Name = "Petty Cash" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= DeleteAsync =============

    [Fact]
    public async Task Delete_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(db, null);
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Delete_AccountNotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(db, tenantId);
        var result = await svc.DeleteAsync(Guid.NewGuid(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Delete_Success_DeletesAccount()
    {
        var tenantId = Guid.NewGuid();
        var acctId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Accounts.Add(new Account { Id = acctId, TenantId = tenantId, Code = "1000", Name = "Cash", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(db, tenantId);
        var result = await svc.DeleteAsync(acctId, db);
        Assert.True(result.Succeeded);
    }
}
