using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public class ProductImageCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IProductImageStorageService productImageStorageService) : IProductImageCommandService
{
    private const int MaxImageSizeBytes = 5 * 1024 * 1024;

    public async Task<ServiceResult<ProductImageUploadResponse>> UploadAsync(
        Guid productId,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (content is null || content.Length == 0)
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status400BadRequest, "Image file is required.");
        }

        if (content.Length > MaxImageSizeBytes)
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status400BadRequest, "Image file size must be 5 MB or less.");
        }

        if (string.IsNullOrWhiteSpace(contentType) || !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status400BadRequest, "Only image files are allowed.");
        }

        var product = await dbContext.Products.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);

        if (product is null)
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status404NotFound, "Product not found.");
        }

        string imageUrl;
        string thumbnailUrl;
        try
        {
            await using var stream = new MemoryStream(content, writable: false);
            var result = await productImageStorageService.UploadAsync(
                tenantId.Value,
                productId,
                stream,
                contentType,
                fileName,
                cancellationToken);
            imageUrl = result.ImageUrl;
            thumbnailUrl = result.ThumbnailUrl;
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<ProductImageUploadResponse>.Failure(StatusCodes.Status400BadRequest, ex.Message);
        }

        product.ImageUrl = imageUrl;
        product.ThumbnailUrl = thumbnailUrl;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<ProductImageUploadResponse>.Success(new ProductImageUploadResponse
        {
            ProductId = productId,
            ImageUrl = imageUrl,
            ThumbnailUrl = thumbnailUrl,
        });
    }
}
