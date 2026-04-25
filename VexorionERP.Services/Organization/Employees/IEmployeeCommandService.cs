using VexorionERP.Contracts.Organization.Employees;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IEmployeeCommandService
{
    Task<ServiceResult<EmployeeDetailsResponse>> CreateAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<EmployeeDetailsResponse>> UpdateAsync(Guid employeeId, UpdateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid employeeId, CancellationToken cancellationToken = default);
}