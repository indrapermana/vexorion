using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface ISupplierQueryService
{
    Task<ServiceResult<IReadOnlyCollection<SupplierListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<SupplierDetailsResponse>> GetByIdAsync(Guid supplierId, CancellationToken cancellationToken = default);
}
