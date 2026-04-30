using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class CompanyCommandServiceBranchTests
{
    private static CompanyCommandService Build(Guid? tenantId)
        => new CompanyCommandService(new FixedTenantProvider(tenantId));

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "Corp", Code = "CORP" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingName_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "", Code = "CORP" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_MissingCode_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "Corp", Code = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "Other", Code = "CORP" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesCompany()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "Corp", Code = "CORP" }, db);
        Assert.True(result.Succeeded);
    }

    // ============= UpdateAsync =============

    [Fact]
    public async Task Update_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCompanyRequest { Name = "Corp", Code = "CORP" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Update_MissingFields_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCompanyRequest { Name = "", Code = "" }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCompanyRequest { Name = "Corp", Code = "CORP" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        db.Companies.Add(new Company { TenantId = tenantId, Name = "Other", Code = "OTHER", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(compId, new UpdateCompanyRequest { Name = "Corp", Code = "OTHER" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Update_Success_UpdatesCompany()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.UpdateAsync(compId, new UpdateCompanyRequest { Name = "Corp Updated", Code = "CORP2" }, db);
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
    public async Task Delete_Success_DeletesCompany()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(compId, db);
        Assert.True(result.Succeeded);
    }
}
