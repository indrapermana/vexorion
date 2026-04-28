using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class DepartmentCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Department>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Department> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateDepartmentRequest request = (CreateDepartmentRequest)input;
        var validation = Validate(request.CompanyId, request.Name, request.Code);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Department>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Department> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateDepartmentRequest request = (CreateDepartmentRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Companies.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.ManagerId.HasValue && !await context.Employees.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.ManagerId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status400BadRequest, "Manager not found in the selected company.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await context.Departments.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.CompanyId == request.CompanyId && x.Code.ToUpper() == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status409Conflict, "A department with the same code already exists in the company.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Department> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateDepartmentRequest request = (UpdateDepartmentRequest)input;
        var validation = Validate(request.CompanyId, request.Name, request.Code);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Department>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Department> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateDepartmentRequest request = (UpdateDepartmentRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Companies.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.ManagerId.HasValue && !await context.Employees.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.ManagerId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status400BadRequest, "Manager not found in the selected company.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await context.Departments.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.CompanyId == request.CompanyId && x.Code.ToUpper() == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<Department>>.Failure(StatusCodes.Status409Conflict, "A department with the same code already exists in the company.");
        }

        return null;
    }

    public override async Task<Department> GetAddToDbObjectAsync(ICreateInput<Department> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Department> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Department> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        UpdateDepartmentRequest request = (UpdateDepartmentRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var department = await context.Departments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (department is null)
        {
            return null!;
        }

        request.Adapt(department);
        Normalize(department);

        return department;
    }

    protected override async Task<Department> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var department = await context.Departments.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return department ?? null!;
    }

    protected override string GetNotFoundMessage() => "Department not found.";

    private static Dictionary<string, string[]> Validate(Guid companyId, string name, string code)
    {
        var errors = new Dictionary<string, string[]>();

        if (companyId == Guid.Empty)
        {
            errors[nameof(CreateDepartmentRequest.CompanyId)] = ["Company is required."];
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateDepartmentRequest.Name)] = ["Name is required."];
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            errors[nameof(CreateDepartmentRequest.Code)] = ["Code is required."];
        }

        return errors;
    }

    private static void Normalize(Department department)
    {
        department.Name = department.Name.Trim();
        department.Code = department.Code.Trim().ToUpperInvariant();
    }
}
