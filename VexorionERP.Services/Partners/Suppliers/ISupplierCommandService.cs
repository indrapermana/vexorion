using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISupplierCommandService
{
    Task<ServiceResult<SupplierDetailsResponse>> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<SupplierDetailsResponse>> UpdateAsync(Guid supplierId, UpdateSupplierRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid supplierId, CancellationToken cancellationToken = default);
}
