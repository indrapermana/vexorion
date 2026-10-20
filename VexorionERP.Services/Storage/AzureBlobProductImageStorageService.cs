using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace VexorionERP.Services;

public class AzureBlobProductImageStorageService(IConfiguration configuration) : IProductImageStorageService
{
    private const string ConnectionStringKey = "AzureBlob:ConnectionString";
    private const string ContainerNameKey = "AzureBlob:ContainerName";
    private const int ThumbnailMaxDimension = 300;

    public async Task<ProductImageUploadResult> UploadAsync(
        Guid tenantId,
        Guid productId,
        Stream content,
        string contentType,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException($"Missing required configuration: {ConnectionStringKey}");
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "product-images";
        }

        var extension = Path.GetExtension(originalFileName)?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".jpg";
        }

        // Read the stream into memory once so it can be used for both full + thumbnail
        using var imageData = new MemoryStream();
        await content.CopyToAsync(imageData, cancellationToken);
        imageData.Position = 0;

        // Generate thumbnail
        using var thumbnailData = new MemoryStream();
        using (var image = await Image.LoadAsync(imageData, cancellationToken))
        {
            var width = image.Width;
            var height = image.Height;

            if (width > ThumbnailMaxDimension || height > ThumbnailMaxDimension)
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
        var containerClient = new BlobContainerClient(connectionString, containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);

        // Upload full image
        var fullBlobName = $"{tenantId:D}/products/{productId:D}/{fileGuid:N}{extension}";
        imageData.Position = 0;
        var fullBlobClient = containerClient.GetBlobClient(fullBlobName);
        await fullBlobClient.UploadAsync(imageData, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            },
        }, cancellationToken);

        // Upload thumbnail (always JPEG)
        var thumbBlobName = $"{tenantId:D}/products/{productId:D}/thumb_{fileGuid:N}.jpg";
        thumbnailData.Position = 0;
        var thumbBlobClient = containerClient.GetBlobClient(thumbBlobName);
        await thumbBlobClient.UploadAsync(thumbnailData, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "image/jpeg" },
        }, cancellationToken);

        return new ProductImageUploadResult(fullBlobClient.Uri.ToString(), thumbBlobClient.Uri.ToString());
    }

    public async Task DeleteAsync(
        string? imageUrl,
        string? thumbnailUrl,
        CancellationToken cancellationToken = default)
    {
        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException($"Missing required configuration: {ConnectionStringKey}");

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
            containerName = "product-images";

        var containerClient = new BlobContainerClient(connectionString, containerName);
        foreach (var value in new[] { imageUrl, thumbnailUrl }.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.Ordinal))
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
                !string.Equals(uri.Scheme, containerClient.Uri.Scheme, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(uri.Host, containerClient.Uri.Host, StringComparison.OrdinalIgnoreCase) ||
                uri.Port != containerClient.Uri.Port)
            {
                throw new InvalidOperationException("Product image URL does not belong to the configured storage account.");
            }

            var expectedPrefix = $"/{containerName}/";
            if (!uri.AbsolutePath.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Product image URL does not belong to the configured storage container.");

            var blobName = Uri.UnescapeDataString(uri.AbsolutePath[expectedPrefix.Length..]);
            await containerClient.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
    }
}

