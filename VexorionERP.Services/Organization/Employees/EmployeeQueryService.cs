using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class EmployeeQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IEmployeeQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var employees = await dbContext.Employees.AsNoTracking().OrderBy(x => x.LastName).ThenBy(x => x.FirstName).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Success(employees.Adapt<IReadOnlyCollection<EmployeeListItemResponse>>());
    }

    public async Task<ServiceResult<EmployeeDetailsResponse>> GetByIdAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var employee = await dbContext.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == employeeId, cancellationToken);
        return employee is null
            ? ServiceResult<EmployeeDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Employee not found.")
            : ServiceResult<EmployeeDetailsResponse>.Success(employee.Adapt<EmployeeDetailsResponse>());
    }
}
