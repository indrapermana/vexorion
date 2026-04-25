using VexorionERP.Contracts.Products;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public interface IProductCommandService
{
    Task<ServiceResult<ProductDetailsResponse>> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<ProductDetailsResponse>> UpdateAsync(Guid productId, UpdateProductRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid productId, CancellationToken cancellationToken = default);
}