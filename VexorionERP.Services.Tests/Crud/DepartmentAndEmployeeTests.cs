using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class DepartmentCommandServiceTests
{
    static DepartmentCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, DepartmentCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new DepartmentCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    [Fact]
    public async Task Create_EmptyCode_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateDepartmentRequest { CompanyId = Guid.NewGuid(), Code = "", Name = "Eng" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyName_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateDepartmentRequest { CompanyId = Guid.NewGuid(), Code = "ENG", Name = "" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyCompanyId_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var result = await svc.CreateAsync(new CreateDepartmentRequest { CompanyId = Guid.Empty, Code = "ENG", Name = "Eng" }, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_DuplicateCodeInSameCompany_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        db.Departments.Add(new Department { Id = Guid.NewGuid(), TenantId = tenantId, CompanyId = companyId, Code = "ENG", Name = "Engineering" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(new CreateDepartmentRequest { CompanyId = companyId, Code = "ENG", Name = "Engineering2" }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_SameCodeDifferentCompany_Succeeds()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyA = Guid.NewGuid();
        var companyB = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyA, TenantId = tenantId, Name = "Corp A", Code = "CORPA" });
        db.Companies.Add(new Company { Id = companyB, TenantId = tenantId, Name = "Corp B", Code = "CORPB" });
        db.Departments.Add(new Department { Id = Guid.NewGuid(), TenantId = tenantId, CompanyId = companyA, Code = "ENG", Name = "Engineering" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(new CreateDepartmentRequest { CompanyId = companyB, Code = "ENG", Name = "Engineering" }, db);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task Update_DuplicateCodeInSameCompany_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        var d1 = Guid.NewGuid();
        db.Departments.Add(new Department { Id = d1, TenantId = tenantId, CompanyId = companyId, Code = "ENG", Name = "Engineering" });
        db.Departments.Add(new Department { Id = Guid.NewGuid(), TenantId = tenantId, CompanyId = companyId, Code = "HR", Name = "HR" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(d1, new UpdateDepartmentRequest { CompanyId = companyId, Code = "HR", Name = "Engineering", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateDepartmentRequest { CompanyId = companyId, Code = "ENG", Name = "Eng", IsActive = true }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesDepartment()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        var id = Guid.NewGuid();
        db.Departments.Add(new Department { Id = id, TenantId = tenantId, CompanyId = companyId, Code = "ENG", Name = "Old" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(id, new UpdateDepartmentRequest { CompanyId = companyId, Code = "ENG", Name = "New", IsActive = true }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("New", db.Departments.Single().Name);
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
    public async Task Delete_HappyPath_DeletesDepartment()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var id = Guid.NewGuid();
        db.Departments.Add(new Department { Id = id, TenantId = tenantId, CompanyId = Guid.NewGuid(), Code = "ENG", Name = "Engineering" });
        await db.SaveChangesAsync();
        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Departments.Count());
    }
}

public class EmployeeCommandServiceTests
{
    static EmployeeCommandServiceTests() => MapsterTestConfiguration.Configure();

    private static (AppDbContext db, EmployeeCommandService svc) Build(Guid? tenantId = null, string? dbName = null)
    {
        var tid = tenantId ?? Guid.NewGuid();
        var db = TestDbContextFactory.Create(tid, dbName ?? Guid.NewGuid().ToString());
        var svc = new EmployeeCommandService(new FixedTenantProvider(tid));
        return (db, svc);
    }

    private static CreateEmployeeRequest ValidCreate(Guid companyId, string number = "EMP-001") => new()
    {
        CompanyId = companyId,
        EmployeeNumber = number,
        FirstName = "John",
        LastName = "Doe",
        Email = "john@test.com",
        JobTitle = "Engineer"
    };

    [Fact]
    public async Task Create_EmptyEmployeeNumber_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var req = ValidCreate(Guid.NewGuid());
        req.EmployeeNumber = "";
        var result = await svc.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_EmptyGuidCompanyId_ReturnsValidationError()
    {
        var (db, svc) = Build();
        var req = ValidCreate(Guid.Empty);
        var result = await svc.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.NotNull(result.Validation);
    }

    [Fact]
    public async Task Create_CompanyNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var (db, svc) = Build(tenantId);
        var req = ValidCreate(Guid.NewGuid());
        var result = await svc.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateEmployeeNumberInCompany_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        db.Employees.Add(new Employee { Id = Guid.NewGuid(), TenantId = tenantId, CompanyId = companyId, EmployeeNumber = "EMP-001", FirstName = "Jane", LastName = "Doe", Email = "jane@test.com", JobTitle = "Dev" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(ValidCreate(companyId, "EMP-001"), db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Create_HappyPath_CreatesEmployee()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        await db.SaveChangesAsync();
        var result = await svc.CreateAsync(ValidCreate(companyId), db);
        Assert.True(result.Succeeded);
        Assert.Equal(1, db.Employees.Count());
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateEmployeeRequest
        {
            CompanyId = companyId,
            EmployeeNumber = "EMP-001",
            FirstName = "John",
            LastName = "Doe",
            Email = "j@test.com",
            JobTitle = "Dev",
            IsActive = true
        }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
    }

    [Fact]
    public async Task Update_DuplicateEmployeeNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        var e1 = Guid.NewGuid();
        db.Employees.Add(new Employee { Id = e1, TenantId = tenantId, CompanyId = companyId, EmployeeNumber = "EMP-001", FirstName = "John", LastName = "Doe", Email = "j@test.com", JobTitle = "Dev" });
        db.Employees.Add(new Employee { Id = Guid.NewGuid(), TenantId = tenantId, CompanyId = companyId, EmployeeNumber = "EMP-002", FirstName = "Jane", LastName = "Doe", Email = "jane@test.com", JobTitle = "Dev" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(e1, new UpdateEmployeeRequest
        {
            CompanyId = companyId,
            EmployeeNumber = "EMP-002",
            FirstName = "John",
            LastName = "Doe",
            Email = "j@test.com",
            JobTitle = "Dev",
            IsActive = true
        }, db);
        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
    }

    [Fact]
    public async Task Update_HappyPath_UpdatesEmployee()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        var id = Guid.NewGuid();
        db.Employees.Add(new Employee { Id = id, TenantId = tenantId, CompanyId = companyId, EmployeeNumber = "EMP-001", FirstName = "Old", LastName = "Name", Email = "old@test.com", JobTitle = "Dev" });
        await db.SaveChangesAsync();
        var result = await svc.UpdateAsync(id, new UpdateEmployeeRequest
        {
            CompanyId = companyId,
            EmployeeNumber = "EMP-001",
            FirstName = "New",
            LastName = "Name",
            Email = "new@test.com",
            JobTitle = "Mgr",
            IsActive = true
        }, db);
        Assert.True(result.Succeeded);
        Assert.Equal("New", db.Employees.Single().FirstName);
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
    public async Task Delete_HappyPath_DeletesEmployee()
    {
        var tenantId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();
        var (db, svc) = Build(tenantId, dbName);
        var companyId = Guid.NewGuid();
        db.Companies.Add(new Company { Id = companyId, TenantId = tenantId, Name = "Corp", Code = "CORP" });
        var id = Guid.NewGuid();
        db.Employees.Add(new Employee { Id = id, TenantId = tenantId, CompanyId = companyId, EmployeeNumber = "EMP-001", FirstName = "John", LastName = "Doe", Email = "j@test.com", JobTitle = "Dev" });
        await db.SaveChangesAsync();
        var result = await svc.DeleteAsync(id, db);
        Assert.True(result.Succeeded);
        Assert.Equal(0, db.Employees.Count());
    }
}
