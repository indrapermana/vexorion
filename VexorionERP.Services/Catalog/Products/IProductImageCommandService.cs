using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface IProductImageCommandService
{
    Task<ServiceResult<ProductImageUploadResponse>> UploadAsync(
        Guid productId,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default);
}
