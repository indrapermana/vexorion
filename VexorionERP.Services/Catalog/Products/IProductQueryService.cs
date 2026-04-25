using VexorionERP.Contracts.Products;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IProductQueryService
{
    Task<ServiceResult<IReadOnlyCollection<ProductListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ServiceResult<ProductDetailsResponse>> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default);
}