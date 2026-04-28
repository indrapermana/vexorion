using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class EmployeeCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Employee>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Employee> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateEmployeeRequest request = (CreateEmployeeRequest)input;
        var validation = Validate(request.CompanyId, request.EmployeeNumber, request.FirstName, request.LastName, request.Email, request.JobTitle);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Employee>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Employee> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateEmployeeRequest request = (CreateEmployeeRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Companies.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.DepartmentId.HasValue && !await context.Departments.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.DepartmentId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status400BadRequest, "Department not found in the selected company.");
        }

        var normalizedNumber = request.EmployeeNumber.Trim().ToUpperInvariant();
        var numberExists = await context.Employees.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.CompanyId == request.CompanyId && x.EmployeeNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (numberExists)
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status409Conflict, "An employee with the same number already exists in the company.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Employee> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateEmployeeRequest request = (UpdateEmployeeRequest)input;
        var validation = Validate(request.CompanyId, request.EmployeeNumber, request.FirstName, request.LastName, request.Email, request.JobTitle);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Employee>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Employee> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateEmployeeRequest request = (UpdateEmployeeRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Companies.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status400BadRequest, "Company not found.");
        }

        if (request.DepartmentId.HasValue && !await context.Departments.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.DepartmentId.Value && x.CompanyId == request.CompanyId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status400BadRequest, "Department not found in the selected company.");
        }

        var normalizedNumber = request.EmployeeNumber.Trim().ToUpperInvariant();
        var numberExists = await context.Employees.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.CompanyId == request.CompanyId && x.EmployeeNumber.ToUpper() == normalizedNumber, cancellationToken);

        if (numberExists)
        {
            return ServiceResult<IEntityResponse<Employee>>.Failure(StatusCodes.Status409Conflict, "An employee with the same number already exists in the company.");
        }

        return null;
    }

    public override async Task<Employee> GetAddToDbObjectAsync(ICreateInput<Employee> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Employee> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Employee> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        UpdateEmployeeRequest request = (UpdateEmployeeRequest)input;
        var employee = await context.Employees.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (employee is null)
        {
            return null!;
        }

        request.Adapt(employee);
        Normalize(employee);

        return employee;
    }

    protected override async Task<Employee> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var employee = await context.Employees.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return employee ?? null!;
    }

    protected override string GetNotFoundMessage() => "Employee not found.";

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
