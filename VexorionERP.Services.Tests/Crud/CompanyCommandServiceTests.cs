using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

/// <summary>
/// Tests for CompanyCommandService — covers company-specific validation,
/// uniqueness rules, normalization, update and delete paths.
/// </summary>
public class CompanyCommandServiceTests
{
    static CompanyCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, CompanyCommandService svc) Build(
        Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new CompanyCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    private static CreateCompanyRequest ValidCreate(string code = "ACME") => new()
    {
        Name = "Acme Corp",
        Code = code,
    };

    private static UpdateCompanyRequest ValidUpdate(string code = "ACME") => new()
    {
        Name = "Acme Corp Updated",
        Code = code,
        IsActive = true,
    };

    [Fact]
    public async Task Create_EmptyName_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "", Code = "X" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyCode_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateCompanyRequest { Name = "Acme", Code = "" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);

        db.Companies.Add(new Company { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Existing", Code = "ACME" });
        await db.SaveChangesAsync();

        var result = await svc.CreateAsync(ValidCreate("ACME"), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesCompany()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(ValidCreate(), db);
        Assert.True(result.Succeeded);
        var company = db.Companies.Single();
        Assert.Equal("ACME", company.Code); // normalized to upper
    }

    [Fact]
    public async Task Update_EmptyName_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateCompanyRequest { Name = "", Code = "X", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Update_DuplicateCode_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);

        var c1 = Guid.NewGuid();
        db.Companies.Add(new Company { Id = c1, TenantId = tenantId, Name = "C1", Code = "AAA" });
        db.Companies.Add(new Company { Id = Guid.NewGuid(), TenantId = tenantId, Name = "C2", Code = "BBB" });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(c1, new UpdateCompanyRequest { Name = "C1", Code = "BBB", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var (db, svc) = Build();
        var result = await svc.UpdateAsync(Guid.NewGuid(), ValidUpdate(), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesCompany()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);

        var id = Guid.NewGuid();
        db.Companies.Add(new Company { Id = id, TenantId = tenantId, Name = "Old", Code = "OLD" });
        await db.SaveChangesAsync();

        var result = await svc.UpdateAsync(id, new UpdateCompanyRequest { Name = "New", Code = "NEW", IsActive = true }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("NEW", db.Companies.Single().Code);
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
    public async Task Delete_HappyPath_DeletesCompany()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);

        var id = Guid.NewGuid();
        db.Companies.Add(new Company { Id = id, TenantId = tenantId, Name = "Bye", Code = "BYE" });
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Companies.Count());
    }
}
