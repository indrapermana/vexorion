using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Organization.Departments;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Organization;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class DepartmentCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IDepartmentCommandService
{
    public async Task<ServiceResult<DepartmentDetailsResponse>> CreateAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CompanyId, request.Name, request.Code);
        if (validation.Count > 0)
        {
            return ServiceResult<DepartmentDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Companies.AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.ManagerId.HasValue && !await dbContext.Employees.AnyAsync(x => x.Id == request.ManagerId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Manager not found in the selected company.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Departments.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.CompanyId == request.CompanyId && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A department with the same code already exists in the company.");
        }

        var department = request.Adapt<Department>();
        department.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(department);

        dbContext.Departments.Add(department);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<DepartmentDetailsResponse>.Success(department.Adapt<DepartmentDetailsResponse>());
    }

    public async Task<ServiceResult<DepartmentDetailsResponse>> UpdateAsync(Guid departmentId, UpdateDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CompanyId, request.Name, request.Code);
        if (validation.Count > 0)
        {
            return ServiceResult<DepartmentDetailsResponse>.ValidationFailure(validation);
        }

        var department = await dbContext.Departments.FirstOrDefaultAsync(x => x.Id == departmentId, cancellationToken);
        if (department is null)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Department not found.");
        }

        if (!await dbContext.Companies.AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.ManagerId.HasValue && !await dbContext.Employees.AnyAsync(x => x.Id == request.ManagerId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Manager not found in the selected company.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Departments.AnyAsync(
            x => x.Id != departmentId && x.TenantId == currentTenantProvider.TenantId.Value && x.CompanyId == request.CompanyId && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A department with the same code already exists in the company.");
        }

        request.Adapt(department);
        Normalize(department);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<DepartmentDetailsResponse>.Success(department.Adapt<DepartmentDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid departmentId, CancellationToken cancellationToken = default)
    {
        var department = await dbContext.Departments.FirstOrDefaultAsync(x => x.Id == departmentId, cancellationToken);
        if (department is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Department not found.");
        }

        dbContext.Departments.Remove(department);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

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