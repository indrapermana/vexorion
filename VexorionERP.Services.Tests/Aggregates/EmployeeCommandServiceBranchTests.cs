using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services;

public class EmployeeCommandServiceBranchTests
{
    private static EmployeeCommandService Build(Guid? tenantId)
        => new EmployeeCommandService(new FixedTenantProvider(tenantId));

    private static CreateEmployeeRequest ValidRequest(Guid companyId) => new CreateEmployeeRequest
    {
        CompanyId = companyId,
        EmployeeNumber = "E001",
        FirstName = "John",
        LastName = "Doe",
        Email = "john.doe@example.com",
        JobTitle = "Developer"
    };

    // ============= CreateAsync =============

    [Fact]
    public async Task Create_NoTenantContext_Returns400()
    {
        var db = TestDbContextFactory.Create(Guid.NewGuid(), Guid.NewGuid().ToString());
        var svc = Build(null);
        var result = await svc.CreateAsync(ValidRequest(Guid.NewGuid()), db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_MissingRequiredFields_ReturnsError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        // Missing EmployeeNumber
        var result = await svc.CreateAsync(new CreateEmployeeRequest
        {
            CompanyId = Guid.NewGuid(),
            EmployeeNumber = "",
            FirstName = "John",
            LastName = "Doe",
            Email = "john@example.com",
            JobTitle = "Dev"
        }, db);
        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_CompanyNotFound_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(ValidRequest(Guid.NewGuid()), db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DepartmentNotFoundInCompany_Returns400()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        // Department belongs to a different company
        var otherCompId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        db.Departments.Add(new Department { Id = deptId, TenantId = tenantId, CompanyId = otherCompId, Name = "HR", Code = "HR", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var req = ValidRequest(compId);
        req.DepartmentId = deptId;
        var result = await svc.CreateAsync(req, db);
        Assert.False(result.Succeeded);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateEmployeeNumber_Returns409()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        db.Employees.Add(new Employee
        {
            TenantId = tenantId,
            CompanyId = compId,
            EmployeeNumber = "E001",
            FirstName = "Jane",
            LastName = "Doe",
            Email = "jane@example.com",
            JobTitle = "Designer",
            IsActive = true
        });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(ValidRequest(compId), db);
        Assert.False(result.Succeeded);
        Assert.Equal(409, result.StatusCode);
    }

    [Fact]
    public async Task Create_Success_CreatesEmployee()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.CreateAsync(ValidRequest(compId), db);
        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task Create_WithValidDepartment_Succeeds()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var deptId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        db.Departments.Add(new Department { Id = deptId, TenantId = tenantId, CompanyId = compId, Name = "HR", Code = "HR", IsActive = true });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var req = ValidRequest(compId);
        req.DepartmentId = deptId;
        var result = await svc.CreateAsync(req, db);
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
    public async Task Delete_Success_DeletesEmployee()
    {
        var tenantId = Guid.NewGuid();
        var compId = Guid.NewGuid();
        var empId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Companies.Add(new Company { Id = compId, TenantId = tenantId, Name = "Corp", Code = "CORP", IsActive = true });
        db.Employees.Add(new Employee
        {
            Id = empId,
            TenantId = tenantId,
            CompanyId = compId,
            EmployeeNumber = "E001",
            FirstName = "John",
            LastName = "Doe",
            Email = "john@example.com",
            JobTitle = "Dev",
            IsActive = true
        });
        await db.SaveChangesAsync();
        var svc = Build(tenantId);
        var result = await svc.DeleteAsync(empId, db);
        Assert.True(result.Succeeded);
    }
}
