using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace VexorionERP.Services;

public sealed class R2ProductImageStorageService(
    IR2ObjectClient client,
    IOptions<StorageOptions> options) : IProductImageStorageService
{
    private const int ThumbnailMaxDimension = 300;
    private readonly R2StorageOptions _options = options.Value.R2;

    public async Task<ProductImageUploadResult> UploadAsync(
        Guid tenantId,
        Guid productId,
        Stream content,
        string contentType,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ProductImageBucketName))
            throw new InvalidOperationException("Missing required configuration: Storage:R2:ProductImageBucketName");
        if (!Uri.TryCreate(_options.ProductImagePublicBaseUrl, UriKind.Absolute, out var publicBaseUri) ||
            publicBaseUri.Scheme != Uri.UriSchemeHttps)
        {
            throw new InvalidOperationException(
                "Storage:R2:ProductImagePublicBaseUrl must be an absolute HTTPS URL for the public product-image custom domain.");
        }

        var extension = Path.GetExtension(originalFileName)?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
            extension = ".jpg";

        await using var imageData = new MemoryStream();
        await content.CopyToAsync(imageData, cancellationToken);
        imageData.Position = 0;

        await using var thumbnailData = new MemoryStream();
        using (var image = await Image.LoadAsync(imageData, cancellationToken))
        {
            if (image.Width > ThumbnailMaxDimension || image.Height > ThumbnailMaxDimension)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(ThumbnailMaxDimension, ThumbnailMaxDimension),
                }));
            }
            await image.SaveAsync(thumbnailData, new JpegEncoder { Quality = 80 }, cancellationToken);
        }

        var fileGuid = Guid.NewGuid();
        var fullObjectKey = $"{tenantId:D}/products/{productId:D}/{fileGuid:N}{extension}";
        var thumbnailObjectKey = $"{tenantId:D}/products/{productId:D}/thumb_{fileGuid:N}.jpg";
        imageData.Position = 0;
        await client.PutAsync(
            _options.ProductImageBucketName,
            fullObjectKey,
            imageData,
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim().ToLowerInvariant(),
            cancellationToken);
        thumbnailData.Position = 0;
        await client.PutAsync(
            _options.ProductImageBucketName,
            thumbnailObjectKey,
            thumbnailData,
            "image/jpeg",
            cancellationToken);

        return new ProductImageUploadResult(
            BuildPublicUrl(publicBaseUri, fullObjectKey),
            BuildPublicUrl(publicBaseUri, thumbnailObjectKey));
    }

    private static string BuildPublicUrl(Uri baseUri, string objectKey) =>
        $"{baseUri.ToString().TrimEnd('/')}/{string.Join('/', objectKey.Split('/').Select(Uri.EscapeDataString))}";
}
