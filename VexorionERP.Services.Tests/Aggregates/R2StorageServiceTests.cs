using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Services.Tests;

public sealed class R2StorageServiceTests
{
    [Fact]
    public async Task DocumentUpload_UsesTenantScopedSafeKey_AndReturnsChecksum()
    {
        var client = new FakeR2ObjectClient { DisposeUploadedStream = true };
        var service = CreateDocumentService(client);
        var tenantId = Guid.NewGuid();
        await using var content = new MemoryStream("hello"u8.ToArray());

        var result = await service.UploadAsync(
            tenantId,
            "Sales / Invoice",
            "../../invoice.pdf",
            content,
            "Application/PDF");

        Assert.True(result.Succeeded);
        Assert.StartsWith($"{tenantId:D}/documents/sales-invoice/", result.Value!.BlobPath);
        Assert.EndsWith("/invoice.pdf", result.Value.BlobPath);
        Assert.Equal("https://signed.example.com/document", result.Value.BlobUrl);
        Assert.Equal(5, result.Value.FileSizeBytes);
        Assert.Equal("2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824", result.Value.ChecksumSha256);
        Assert.Equal("documents", client.LastBucket);
        Assert.Equal("application/pdf", client.LastContentType);
    }

    [Fact]
    public async Task DocumentDownloadUrl_IsReadOnlyShortLivedAndUsesSafeAttachmentName()
    {
        var client = new FakeR2ObjectClient { ObjectExists = true };
        var service = CreateDocumentService(client);

        var result = await service.GetDownloadUrlAsync(
            "tenant/documents/invoice/id/report.pdf",
            "../report ü.pdf\r\nInjected: true",
            "application/pdf");

        Assert.True(result.Succeeded);
        Assert.Equal(TimeSpan.FromMinutes(7), client.LastLifetime);
        Assert.Equal("attachment; filename*=UTF-8''report%20%C3%BC.pdf", client.LastContentDisposition);
        Assert.Equal("application/pdf", client.LastContentType);
    }

    [Fact]
    public async Task DocumentOperations_ReturnNotFound_AndDeleteIsIdempotent()
    {
        var client = new FakeR2ObjectClient { ObjectExists = false };
        var service = CreateDocumentService(client);

        var download = await service.DownloadAsync("missing.pdf");
        var url = await service.GetDownloadUrlAsync("missing.pdf");
        var delete = await service.DeleteAsync("missing.pdf");

        Assert.False(download.Succeeded);
        Assert.Equal(404, download.StatusCode);
        Assert.False(url.Succeeded);
        Assert.Equal(404, url.StatusCode);
        Assert.True(delete.Succeeded);
        Assert.True(delete.Value);
        Assert.Equal(1, client.DeleteCount);
    }

    [Fact]
    public async Task ProductImageUpload_UsesSeparateBucket_AndPublicCustomDomain()
    {
        var client = new FakeR2ObjectClient();
        var options = Options.Create(CreateOptions());
        var service = new R2ProductImageStorageService(client, options);
        await using var content = new MemoryStream();
        using (var image = new Image<Rgba32>(10, 10))
            await image.SaveAsPngAsync(content);
        content.Position = 0;

        var result = await service.UploadAsync(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            content,
            "image/png",
            "photo.png");

        Assert.Equal(2, client.Uploads.Count);
        Assert.All(client.Uploads, upload => Assert.Equal("product-images", upload.Bucket));
        Assert.StartsWith("https://images.example.com/11111111-1111-1111-1111-111111111111/products/", result.ImageUrl);
        Assert.EndsWith(".png", result.ImageUrl);
        Assert.StartsWith("https://images.example.com/11111111-1111-1111-1111-111111111111/products/", result.ThumbnailUrl);
        Assert.EndsWith(".jpg", result.ThumbnailUrl);
    }

    [Fact]
    public async Task ProductImageUpload_RejectsMissingPublicDomain()
    {
        var options = CreateOptions();
        options.R2.ProductImagePublicBaseUrl = string.Empty;
        var service = new R2ProductImageStorageService(new FakeR2ObjectClient(), Options.Create(options));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UploadAsync(
            Guid.NewGuid(), Guid.NewGuid(), new MemoryStream([1]), "image/png", "photo.png"));

        Assert.Contains("absolute HTTPS URL", exception.Message);
    }

    [Fact]
    public async Task ProductImageDelete_RemovesFullAndThumbnailObjectsFromConfiguredBucket()
    {
        var client = new FakeR2ObjectClient();
        var service = new R2ProductImageStorageService(client, Options.Create(CreateOptions()));

        await service.DeleteAsync(
            "https://images.example.com/tenant/products/product/full%20image.png",
            "https://images.example.com/tenant/products/product/thumb_image.jpg");

        Assert.Equal(
            [("product-images", "tenant/products/product/full image.png"), ("product-images", "tenant/products/product/thumb_image.jpg")],
            client.Deletions);
    }

    [Fact]
    public async Task ProductImageDelete_RejectsUrlOutsideConfiguredDomain()
    {
        var client = new FakeR2ObjectClient();
        var service = new R2ProductImageStorageService(client, Options.Create(CreateOptions()));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.DeleteAsync("https://untrusted.example/object.png", null));

        Assert.Contains("configured public storage domain", exception.Message);
        Assert.Empty(client.Deletions);
    }

    private static R2DocumentStorageService CreateDocumentService(FakeR2ObjectClient client) =>
        new(client, Options.Create(CreateOptions()));

    private static StorageOptions CreateOptions() => new()
    {
        Provider = StorageProviders.R2,
        R2 = new R2StorageOptions
        {
            AccountId = "account-id",
            DocumentBucketName = "documents",
            ProductImageBucketName = "product-images",
            ProductImagePublicBaseUrl = "https://images.example.com",
            AccessKeyId = "access-key",
            SecretAccessKey = "secret-key",
            SignedUrlLifetimeMinutes = 7,
        },
    };

    private sealed class FakeR2ObjectClient : IR2ObjectClient
    {
        public bool ObjectExists { get; init; } = true;
        public string? LastBucket { get; private set; }
        public string? LastContentType { get; private set; }
        public TimeSpan LastLifetime { get; private set; }
        public string? LastContentDisposition { get; private set; }
        public int DeleteCount { get; private set; }
        public bool DisposeUploadedStream { get; init; }
        public List<(string Bucket, string Key)> Uploads { get; } = [];
        public List<(string Bucket, string Key)> Deletions { get; } = [];

        public async Task PutAsync(string bucketName, string objectKey, Stream content, string contentType, CancellationToken cancellationToken)
        {
            LastBucket = bucketName;
            LastContentType = contentType;
            Uploads.Add((bucketName, objectKey));
            await content.CopyToAsync(Stream.Null, cancellationToken);
            if (DisposeUploadedStream)
                await content.DisposeAsync();
        }

        public Task<bool> ExistsAsync(string bucketName, string objectKey, CancellationToken cancellationToken) =>
            Task.FromResult(ObjectExists);

        public string CreatePresignedReadUrl(string bucketName, string objectKey, TimeSpan lifetime, string? contentDisposition, string? contentType)
        {
            LastLifetime = lifetime;
            LastContentDisposition = contentDisposition;
            LastContentType = contentType;
            return "https://signed.example.com/document";
        }

        public Task<byte[]> DownloadAsync(string bucketName, string objectKey, CancellationToken cancellationToken) =>
            Task.FromResult("content"u8.ToArray());

        public Task DeleteAsync(string bucketName, string objectKey, CancellationToken cancellationToken)
        {
            DeleteCount++;
            Deletions.Add((bucketName, objectKey));
            return Task.CompletedTask;
        }
    }
}
