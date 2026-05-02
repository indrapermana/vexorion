namespace VexorionERP.Services;

public record ProductImageUploadResult(string ImageUrl, string ThumbnailUrl);

public interface IProductImageStorageService
{
    Task<ProductImageUploadResult> UploadAsync(
        Guid tenantId,
        Guid productId,
        Stream content,
        string contentType,
        string originalFileName,
        CancellationToken cancellationToken = default);
}
