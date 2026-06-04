using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectAssignableEmployeesQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectAssignableEmployeesQuery, ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>> Handle(
        GetProjectAssignableEmployeesQuery request,
        CancellationToken cancellationToken)
    {
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        if (!tenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var tenantId = tenantProvider.TenantId.Value;
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var projectExists = await dbContext.Projects
            .GetByTenant(tenantId)
            .AnyAsync(x => x.Id == request.ProjectId, cancellationToken);

        if (!projectExists)
        {
            return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Project not found.");
        }

        var employees = await dbContext.Employees
            .GetByTenant(tenantId)
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new EmployeeListItemResponse
            {
                Id = x.Id,
                CompanyId = x.CompanyId,
                DepartmentId = x.DepartmentId,
                EmployeeNumber = x.EmployeeNumber,
                FirstName = x.FirstName,
                LastName = x.LastName,
                Email = x.Email,
                JobTitle = x.JobTitle,
                IsActive = x.IsActive,
            })
            .ToArrayAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>.Success(employees);
    }
}