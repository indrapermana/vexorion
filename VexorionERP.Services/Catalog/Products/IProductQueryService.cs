using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Services;

public interface IProductQueryService
{
    Task<ServiceResult<IReadOnlyCollection<ProductListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<ProductDetailsResponse>> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default);
}
