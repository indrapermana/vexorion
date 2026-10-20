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

    public async Task DeleteAsync(
        string? imageUrl,
        string? thumbnailUrl,
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

        foreach (var objectKey in GetObjectKeys(publicBaseUri, imageUrl, thumbnailUrl))
            await client.DeleteAsync(_options.ProductImageBucketName, objectKey, cancellationToken);
    }

    private static IEnumerable<string> GetObjectKeys(Uri publicBaseUri, params string?[] urls)
    {
        var basePath = publicBaseUri.AbsolutePath.TrimEnd('/');
        foreach (var value in urls.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.Ordinal))
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
                !string.Equals(uri.Scheme, publicBaseUri.Scheme, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(uri.Host, publicBaseUri.Host, StringComparison.OrdinalIgnoreCase) ||
                uri.Port != publicBaseUri.Port)
            {
                throw new InvalidOperationException("Product image URL does not belong to the configured public storage domain.");
            }

            var path = Uri.UnescapeDataString(uri.AbsolutePath);
            if (!string.IsNullOrEmpty(basePath))
            {
                if (!path.StartsWith(basePath + '/', StringComparison.Ordinal))
                    throw new InvalidOperationException("Product image URL does not belong to the configured public storage path.");
                path = path[(basePath.Length + 1)..];
            }
            else
            {
                path = path.TrimStart('/');
            }

            if (string.IsNullOrWhiteSpace(path) || path.Split('/').Any(segment => segment is "." or ".."))
                throw new InvalidOperationException("Product image URL contains an invalid object key.");

            yield return path;
        }
    }

    private static string BuildPublicUrl(Uri baseUri, string objectKey) =>
        $"{baseUri.ToString().TrimEnd('/')}/{string.Join('/', objectKey.Split('/').Select(Uri.EscapeDataString))}";
}
