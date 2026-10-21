using Microsoft.AspNetCore.Http;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public sealed class TenantStorageCleanupServiceTests
{
    [Fact]
    public async Task DeleteTenantObjects_DeletesDistinctTenantDocumentsAndProductImages()
    {
        var tenantId = Guid.NewGuid();
        var otherTenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(otherTenantId, Guid.NewGuid().ToString());
        db.ProjectDocuments.AddRange(
            CreateDocument(tenantId, "documents/current.pdf"),
            CreateDocument(otherTenantId, "other/current.pdf"));
        db.DocumentVersions.AddRange(
            CreateVersion(tenantId, "documents/old.pdf"),
            CreateVersion(tenantId, "documents/current.pdf"));
        db.GeneratedDocuments.Add(CreateGeneratedDocument(tenantId, "generated/invoice.pdf"));
        db.Products.AddRange(
            CreateProduct(tenantId, "https://images.example/product.png", "https://images.example/product-thumb.jpg"),
            CreateProduct(otherTenantId, "https://images.example/other.png", null));
        await db.SaveChangesAsync();
        var documents = new RecordingDocumentStorageService();
        var images = new RecordingProductImageStorageService();
        var service = new TenantStorageCleanupService(db, documents, images);

        var result = await service.DeleteTenantObjectsAsync(tenantId);

        Assert.True(result.Succeeded);
        Assert.Equal(
            ["documents/current.pdf", "documents/old.pdf", "generated/invoice.pdf"],
            documents.Deleted.Order());
        Assert.Equal(
            [("https://images.example/product.png", "https://images.example/product-thumb.jpg")],
            images.Deleted);
    }

    [Fact]
    public async Task DeleteTenantObjects_WhenDocumentDeletionFails_ReturnsGatewayErrorAndSkipsImages()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.ProjectDocuments.Add(CreateDocument(tenantId, "documents/failed.pdf"));
        db.Products.Add(CreateProduct(tenantId, "https://images.example/product.png", null));
        await db.SaveChangesAsync();
        var documents = new RecordingDocumentStorageService { FailedPath = "documents/failed.pdf" };
        var images = new RecordingProductImageStorageService();
        var service = new TenantStorageCleanupService(db, documents, images);

        var result = await service.DeleteTenantObjectsAsync(tenantId);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Empty(images.Deleted);
    }

    [Fact]
    public async Task DeleteTenantObjects_WhenProductImageDeletionFails_ReturnsGatewayError()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        db.Products.Add(CreateProduct(tenantId, "https://images.example/failed.png", null));
        await db.SaveChangesAsync();
        var images = new RecordingProductImageStorageService { ShouldFail = true };
        var service = new TenantStorageCleanupService(db, new RecordingDocumentStorageService(), images);

        var result = await service.DeleteTenantObjectsAsync(tenantId);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
    }

    private static ProjectDocument CreateDocument(Guid tenantId, string path) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ProjectId = Guid.NewGuid(),
        DocumentNumber = Guid.NewGuid().ToString("N"), Title = "Document", FileName = "file.pdf",
        ContentType = "application/pdf", StoragePath = path, FileSizeBytes = 1
    };

    private static DocumentVersion CreateVersion(Guid tenantId, string path) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ProjectDocumentId = Guid.NewGuid(), VersionNumber = 1,
        FileName = "file.pdf", ContentType = "application/pdf", StoragePath = path, FileSizeBytes = 1
    };

    private static GeneratedDocument CreateGeneratedDocument(Guid tenantId, string path) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, SourceType = GeneratedDocumentSourceType.SalesInvoice,
        SourceEntityId = Guid.NewGuid(), Format = GeneratedDocumentFormat.Pdf,
        FileName = "invoice.pdf", ContentType = "application/pdf", BlobPath = path,
        ChecksumSha256 = new string('a', 64), FileSizeBytes = 1, GeneratedAtUtc = DateTime.UtcNow,
        GeneratedByUserId = Guid.NewGuid()
    };

    private static Product CreateProduct(Guid tenantId, string? imageUrl, string? thumbnailUrl) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, Sku = Guid.NewGuid().ToString("N"),
        Name = "Product", UnitOfMeasure = "EA", ImageUrl = imageUrl, ThumbnailUrl = thumbnailUrl
    };

    private sealed class RecordingDocumentStorageService : IDocumentStorageService
    {
        public string? FailedPath { get; init; }
        public List<string> Deleted { get; } = [];

        public Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(Guid tenantId, string sourceType, string fileName, Stream content, string contentType, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, string? downloadFileName = null, string? contentType = null, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
        {
            Deleted.Add(blobPath);
            return Task.FromResult(blobPath == FailedPath
                ? ServiceResult<bool>.Failure(StatusCodes.Status502BadGateway, "failed")
                : ServiceResult<bool>.Success(true));
        }
    }

    private sealed class RecordingProductImageStorageService : IProductImageStorageService
    {
        public bool ShouldFail { get; init; }
        public List<(string? ImageUrl, string? ThumbnailUrl)> Deleted { get; } = [];

        public Task<ProductImageUploadResult> UploadAsync(Guid tenantId, Guid productId, Stream content, string contentType, string originalFileName, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteAsync(string? imageUrl, string? thumbnailUrl, CancellationToken cancellationToken = default)
        {
            Deleted.Add((imageUrl, thumbnailUrl));
            return ShouldFail
                ? Task.FromException(new InvalidOperationException("failed"))
                : Task.CompletedTask;
        }
    }
}
