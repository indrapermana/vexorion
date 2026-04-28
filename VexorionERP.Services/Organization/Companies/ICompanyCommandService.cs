using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ICompanyCommandService
{
    Task<ServiceResult<CompanyDetailsResponse>> CreateAsync(CreateCompanyRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<CompanyDetailsResponse>> UpdateAsync(Guid companyId, UpdateCompanyRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid companyId, CancellationToken cancellationToken = default);
}
