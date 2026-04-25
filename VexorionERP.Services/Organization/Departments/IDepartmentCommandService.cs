using VexorionERP.Contracts.Organization.Departments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IDepartmentCommandService
{
    Task<ServiceResult<DepartmentDetailsResponse>> CreateAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<DepartmentDetailsResponse>> UpdateAsync(Guid departmentId, UpdateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid departmentId, CancellationToken cancellationToken = default);
}