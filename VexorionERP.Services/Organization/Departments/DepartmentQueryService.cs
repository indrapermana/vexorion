using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Organization.Departments;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class DepartmentQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IDepartmentQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<DepartmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<DepartmentListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var departments = await dbContext.Departments.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<DepartmentListItemResponse>>.Success(departments.Adapt<IReadOnlyCollection<DepartmentListItemResponse>>());
    }

    public async Task<ServiceResult<DepartmentDetailsResponse>> GetByIdAsync(Guid departmentId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var department = await dbContext.Departments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == departmentId, cancellationToken);
        return department is null
            ? ServiceResult<DepartmentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Department not found.")
            : ServiceResult<DepartmentDetailsResponse>.Success(department.Adapt<DepartmentDetailsResponse>());
    }
}