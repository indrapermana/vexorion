using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IDepartmentCommandService
{
    Task<ServiceResult<DepartmentDetailsResponse>> CreateAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<DepartmentDetailsResponse>> UpdateAsync(Guid departmentId, UpdateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid departmentId, CancellationToken cancellationToken = default);
}
