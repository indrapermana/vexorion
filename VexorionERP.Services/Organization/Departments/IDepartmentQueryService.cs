using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IDepartmentQueryService
{
    Task<ServiceResult<IReadOnlyCollection<DepartmentListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<DepartmentDetailsResponse>> GetByIdAsync(Guid departmentId, CancellationToken cancellationToken = default);
}
