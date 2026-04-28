using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class EmployeeCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IEmployeeCommandService
{
    public async Task<ServiceResult<EmployeeDetailsResponse>> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CompanyId, request.EmployeeNumber, request.FirstName, request.LastName, request.Email, request.JobTitle);
        if (validation.Count > 0)
        {
            return ServiceResult<EmployeeDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Companies.AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.DepartmentId.HasValue && !await dbContext.Departments.AnyAsync(x => x.Id == request.DepartmentId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Department not found in the selected company.");
        }

        var normalizedNumber = request.EmployeeNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Employees.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.CompanyId == request.CompanyId && x.EmployeeNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An employee with the same number already exists in the company.");
        }

        var employee = request.Adapt<Employee>();
        employee.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(employee);

        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<EmployeeDetailsResponse>.Success(employee.Adapt<EmployeeDetailsResponse>());
    }

    public async Task<ServiceResult<EmployeeDetailsResponse>> UpdateAsync(Guid employeeId, UpdateEmployeeRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.CompanyId, request.EmployeeNumber, request.FirstName, request.LastName, request.Email, request.JobTitle);
        if (validation.Count > 0)
        {
            return ServiceResult<EmployeeDetailsResponse>.ValidationFailure(validation);
        }

        var employee = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);
        if (employee is null)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Employee not found.");
        }

        if (!await dbContext.Companies.AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.DepartmentId.HasValue && !await dbContext.Departments.AnyAsync(x => x.Id == request.DepartmentId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Department not found in the selected company.");
        }

        var normalizedNumber = request.EmployeeNumber.Trim().ToUpperInvariant();
        var numberExists = await dbContext.Employees.AnyAsync(
            x => x.Id != employeeId && x.TenantId == currentTenantProvider.TenantId.Value && x.CompanyId == request.CompanyId && x.EmployeeNumber.ToUpper() == normalizedNumber,
            cancellationToken);

        if (numberExists)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An employee with the same number already exists in the company.");
        }

        request.Adapt(employee);
        Normalize(employee);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<EmployeeDetailsResponse>.Success(employee.Adapt<EmployeeDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);
        if (employee is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Employee not found.");
        }

        dbContext.Employees.Remove(employee);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(Guid companyId, string employeeNumber, string firstName, string lastName, string email, string jobTitle)
    {
        var errors = new Dictionary<string, string[]>();

        if (companyId == Guid.Empty)
        {
            errors[nameof(CreateEmployeeRequest.CompanyId)] = ["Company is required."];
        }

        if (string.IsNullOrWhiteSpace(employeeNumber))
        {
            errors[nameof(CreateEmployeeRequest.EmployeeNumber)] = ["Employee number is required."];
        }

        if (string.IsNullOrWhiteSpace(firstName))
        {
            errors[nameof(CreateEmployeeRequest.FirstName)] = ["First name is required."];
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            errors[nameof(CreateEmployeeRequest.LastName)] = ["Last name is required."];
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors[nameof(CreateEmployeeRequest.Email)] = ["Email is required."];
        }

        if (string.IsNullOrWhiteSpace(jobTitle))
        {
            errors[nameof(CreateEmployeeRequest.JobTitle)] = ["Job title is required."];
        }

        return errors;
    }

    private static void Normalize(Employee employee)
    {
        employee.EmployeeNumber = employee.EmployeeNumber.Trim().ToUpperInvariant();
        employee.FirstName = employee.FirstName.Trim();
        employee.LastName = employee.LastName.Trim();
        employee.Email = employee.Email.Trim();
        employee.PhoneNumber = string.IsNullOrWhiteSpace(employee.PhoneNumber) ? null : employee.PhoneNumber.Trim();
        employee.JobTitle = employee.JobTitle.Trim();
    }
}
