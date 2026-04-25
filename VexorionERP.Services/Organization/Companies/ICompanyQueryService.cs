using VexorionERP.Contracts.Organization.Companies;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface ICompanyQueryService
{
    Task<ServiceResult<IReadOnlyCollection<CompanyListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<CompanyDetailsResponse>> GetByIdAsync(Guid companyId, CancellationToken cancellationToken = default);
}