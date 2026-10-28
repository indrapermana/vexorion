using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public sealed class GeneratedDocumentServiceFailureTests
{
    [Fact]
    public async Task Generate_WhenMetadataSaveFails_DeletesUploadedObject()
    {
        var tenantId = Guid.NewGuid();
        await using var db = new FailingSaveDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        var storage = new RecordingStorageService();
        var service = new GeneratedDocumentService(
            db,
            new FixedTenantProvider(tenantId),
            new StubRenderer(),
            storage,
            new StubAuditLogger());

        var result = await service.GenerateAsync(new GenerateDocumentRequest
        {
            SourceType = GeneratedDocumentSourceType.SalesOrder,
            SourceEntityId = Guid.NewGuid(),
            Format = GeneratedDocumentFormat.Docx,
        });

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status500InternalServerError, result.StatusCode);
        Assert.Contains("uploaded object was removed", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(["generated/document.docx"], storage.DeletedPaths);
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Fact]
    public async Task Generate_WhenMetadataSaveAndCleanupFail_ReturnsActionableRecoveryMessage()
    {
        var tenantId = Guid.NewGuid();
        await using var db = new FailingSaveDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        var storage = new RecordingStorageService { FailDelete = true };
        var service = new GeneratedDocumentService(
            db,
            new FixedTenantProvider(tenantId),
            new StubRenderer(),
            storage,
            new StubAuditLogger());

        var result = await service.GenerateAsync(new GenerateDocumentRequest
        {
            SourceType = GeneratedDocumentSourceType.SalesOrder,
            SourceEntityId = Guid.NewGuid(),
            Format = GeneratedDocumentFormat.Docx,
        });

        Assert.False(result.Succeeded);
        Assert.Contains("could not be removed", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("simulated cleanup failure", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FailingSaveDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.FromException<int>(new DbUpdateException("simulated metadata failure"));
    }

    private sealed class StubRenderer : IDocumentRendererService
    {
        public Task<RenderedDocumentResult> RenderAsync(
            Guid tenantId,
            GeneratedDocumentSourceType sourceType,
            Guid sourceEntityId,
            GeneratedDocumentFormat format,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new RenderedDocumentResult(
                "document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                [1, 2, 3]));
    }

    private sealed class RecordingStorageService : IDocumentStorageService
    {
        public bool FailDelete { get; init; }
        public List<string> DeletedPaths { get; } = [];

        public Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
            Guid tenantId,
            string sourceType,
            string fileName,
            Stream content,
            string contentType,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(ServiceResult<DocumentStorageUploadResult>.Success(new DocumentStorageUploadResult(
                "generated/document.docx",
                "https://example.test/generated/document.docx",
                3,
                new string('a', 64))));

        public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
        {
            DeletedPaths.Add(blobPath);
            return Task.FromResult(FailDelete
                ? ServiceResult<bool>.Failure(StatusCodes.Status502BadGateway, "simulated cleanup failure")
                : ServiceResult<bool>.Success(true));
        }

        public Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, string? downloadFileName = null, string? contentType = null, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }

    private sealed class StubAuditLogger : IAuditLogger
    {
        public Task LogAsync(string eventType, Guid? tenantId, Guid? actorUserId, Guid? targetUserId, string? entityName, string? entityId, string? description, object? metadata = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
