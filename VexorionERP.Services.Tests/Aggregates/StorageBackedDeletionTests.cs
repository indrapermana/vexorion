using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public sealed class StorageBackedDeletionTests
{
    [Fact]
    public async Task DeleteDocument_ReleasesEveryChargedVersionWithoutDoubleCountingCurrentBlob()
    {
        var owner = Guid.NewGuid();
        var collaborator = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(owner, Guid.NewGuid().ToString());
        var project = CreateProject(owner);
        var document = CreateDocument(owner, project.Id, "v2");
        document.Status = ManagedDocumentStatus.Archived;
        var first = CreateVersion(owner, document.Id, 1, "v1");
        first.FileSizeBytes = 3;
        var second = CreateVersion(collaborator, document.Id, 2, "v2");
        second.FileSizeBytes = 7;
        db.AddRange(project, document, first, second,
            new StorageUsageSummary { Id = Guid.NewGuid(), TenantId = owner, UsedBytes = 3 },
            new StorageUsageSummary { Id = Guid.NewGuid(), TenantId = collaborator, UsedBytes = 7 });
        await db.SaveChangesAsync();
        var storage = new RecordingDocumentStorageService();
        var service = new ProjectDocumentCommandService(new FixedTenantProvider(owner), new NoOpAuditLogger(), new HttpContextAccessor(), storage, new StorageAccountingService());
        Assert.True((await service.DeleteAsync(document.Id, db)).Succeeded);
        Assert.Equal(2, storage.Deleted.Count);
        Assert.Empty(await db.DocumentVersions.IgnoreQueryFilters().ToListAsync());
        Assert.All(await db.StorageUsageSummaries.IgnoreQueryFilters().ToListAsync(), summary => Assert.Equal(0, summary.UsedBytes));
        Assert.Equal(-10, await db.StorageUsageLedgers.IgnoreQueryFilters().SumAsync(entry => entry.DeltaBytes));
    }

    [Fact]
    public async Task DeleteDocument_ForeignParentDoesNotTouchFilesOrAccounting()
    {
        var tenant = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenant, Guid.NewGuid().ToString());
        var project = CreateProject(Guid.NewGuid());
        var document = CreateDocument(project.TenantId, project.Id, "foreign");
        db.AddRange(project, document);
        await db.SaveChangesAsync();
        var storage = new RecordingDocumentStorageService();
        var service = new ProjectDocumentCommandService(new FixedTenantProvider(tenant), new NoOpAuditLogger(), new HttpContextAccessor(), storage, new StorageAccountingService());
        Assert.Equal(404, (await service.DeleteAsync(document.Id, db)).StatusCode);
        Assert.Empty(storage.Deleted);
        Assert.Empty(db.StorageUsageLedgers);
    }

    [Fact]
    public async Task UpdateDocument_ArchivedMetadataIsReadOnly()
    {
        var tenant = Guid.NewGuid();
        await using var db = TestDbContextFactory.Create(tenant, Guid.NewGuid().ToString());
        var project = CreateProject(tenant);
        var document = CreateDocument(tenant, project.Id, "archived");
        document.Status = ManagedDocumentStatus.Archived;
        db.AddRange(project, document);
        await db.SaveChangesAsync();
        var service = new ProjectDocumentCommandService(new FixedTenantProvider(tenant), new NoOpAuditLogger(), new HttpContextAccessor(), new RecordingDocumentStorageService(), new StorageAccountingService());
        var result = await service.UpdateAsync(document.Id, new VexorionERP.Contracts.UpdateProjectDocumentRequest { Title = "Changed" }, db);
        Assert.Equal("document.archived_read_only", result.ErrorCode);
        Assert.Equal("Document", document.Title);
    }

    [Fact]
    public async Task DeleteDocument_RemovesEveryDistinctVersionObject()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var project = CreateProject(tenantId);
        var document = CreateDocument(tenantId, project.Id, "current-key");
        db.AddRange(project, document,
            CreateVersion(tenantId, document.Id, 1, "old-key"),
            CreateVersion(tenantId, document.Id, 2, "current-key"));
        await db.SaveChangesAsync();
        var storage = new RecordingDocumentStorageService();
        var service = new ProjectDocumentCommandService(
            new FixedTenantProvider(tenantId), new NoOpAuditLogger(), new HttpContextAccessor(), storage, new StorageAccountingService());

        var result = await service.DeleteAsync(document.Id, db);

        Assert.True(result.Succeeded);
        Assert.Equal(["current-key", "old-key"], storage.Deleted.Order());
        Assert.False(await db.ProjectDocuments.AnyAsync());
        Assert.False(await db.DocumentVersions.AnyAsync());
    }

    [Fact]
    public async Task DeleteDocument_WhenStorageFails_KeepsDatabaseRows()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var project = CreateProject(tenantId);
        var document = CreateDocument(tenantId, project.Id, "failed-key");
        db.AddRange(project, document, CreateVersion(tenantId, document.Id, 1, "failed-key"));
        await db.SaveChangesAsync();
        var storage = new RecordingDocumentStorageService { FailedPath = "failed-key" };
        var service = new ProjectDocumentCommandService(
            new FixedTenantProvider(tenantId), new NoOpAuditLogger(), new HttpContextAccessor(), storage, new StorageAccountingService());

        var result = await service.DeleteAsync(document.Id, db);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Contains("stored file", result.ErrorMessage);
        Assert.True(await db.ProjectDocuments.AnyAsync(x => x.Id == document.Id));
    }

    [Fact]
    public async Task DeleteProject_RemovesObjectsForAllDocumentsAndVersions()
    {
        var tenantId = Guid.NewGuid();
        var db = TestDbContextFactory.Create(tenantId, Guid.NewGuid().ToString());
        var project = CreateProject(tenantId);
        var first = CreateDocument(tenantId, project.Id, "first-current");
        var second = CreateDocument(tenantId, project.Id, "second-current");
        db.AddRange(project, first, second,
            CreateVersion(tenantId, first.Id, 1, "first-old"),
            CreateVersion(tenantId, first.Id, 2, "first-current"),
            CreateVersion(tenantId, second.Id, 1, "second-current"));
        await db.SaveChangesAsync();
        var storage = new RecordingDocumentStorageService();
        var service = new ProjectCommandService(
            new FixedTenantProvider(tenantId), new NoOpAuditLogger(), new HttpContextAccessor(), new ProjectDocumentCommandService(new FixedTenantProvider(tenantId), new NoOpAuditLogger(), new HttpContextAccessor(), storage, new StorageAccountingService()));

        var result = await service.DeleteAsync(project.Id, db);

        Assert.True(result.Succeeded);
        Assert.Equal(["first-current", "first-old", "second-current"], storage.Deleted.Order());
        Assert.False(await db.Projects.AnyAsync(x => x.Id == project.Id));
        Assert.False(await db.ProjectDocuments.AnyAsync(x => x.ProjectId == project.Id));
    }

    private static Project CreateProject(Guid tenantId) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ProjectCategoryId = Guid.NewGuid(),
        ProjectNumber = Guid.NewGuid().ToString("N"), Name = "Project", StartDate = DateOnly.FromDateTime(DateTime.UtcNow)
    };

    private static ProjectDocument CreateDocument(Guid tenantId, Guid projectId, string path) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ProjectId = projectId,
        DocumentNumber = Guid.NewGuid().ToString("N"), Title = "Document", FileName = "file.pdf",
        ContentType = "application/pdf", StoragePath = path, FileSizeBytes = 1
    };

    private static DocumentVersion CreateVersion(Guid tenantId, Guid documentId, int number, string path) => new()
    {
        Id = Guid.NewGuid(), TenantId = tenantId, ProjectDocumentId = documentId, VersionNumber = number,
        FileName = "file.pdf", ContentType = "application/pdf", StoragePath = path, FileSizeBytes = 1
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
}
