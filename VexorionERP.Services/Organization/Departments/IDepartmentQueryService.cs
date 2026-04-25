using VexorionERP.Contracts.Organization.Departments;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IDepartmentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<DepartmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<DepartmentDetailsResponse>> GetByIdAsync(Guid departmentId, CancellationToken cancellationToken = default);
}