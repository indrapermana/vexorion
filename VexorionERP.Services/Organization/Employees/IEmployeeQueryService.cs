using VexorionERP.Contracts.Organization.Employees;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IEmployeeQueryService
{
    Task<ServiceResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<EmployeeDetailsResponse>> GetByIdAsync(Guid employeeId, CancellationToken cancellationToken = default);
}