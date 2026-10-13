using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;
using Xunit;

namespace VexorionERP.Handler.Tests;

public class AddDocumentVersionCommandHandlerTests
{
    [Fact]
    public async Task Handle_WhenValid_AddsNextVersionAndKeepsPreviousVersion()
    {
        var tenantId = Guid.NewGuid();
        var (db, documentId, originalVersionId) = CreateDbWithDocument(tenantId);
        var accounting = new FakeStorageAccountingService();
        var services = BuildServices(tenantId, db, accounting, new FakeDocumentStorageService());

        var handler = new AddDocumentVersionCommandHandler(services);
        var file = CreateFormFile("updated.pdf", "application/pdf", new byte[] { 1, 2, 3, 4, 5 });

        var result = await handler.Handle(new AddDocumentVersionCommand(documentId, "v2", file), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Value);
        Assert.Equal(2, result.Value!.VersionNumber);

        var persisted = await db.ProjectDocuments.SingleAsync(x => x.Id == documentId);
        Assert.Equal(2, persisted.CurrentVersionNumber);
        Assert.Equal("updated.pdf", persisted.FileName);

        var versions = await db.DocumentVersions
            .Where(x => x.ProjectDocumentId == documentId)
            .OrderBy(x => x.VersionNumber)
            .ToListAsync();

        Assert.Equal(2, versions.Count);
        Assert.Equal(1, versions[0].VersionNumber);
        Assert.Equal(originalVersionId, versions[0].Id);
        Assert.Equal("initial.pdf", versions[0].FileName);
        Assert.Equal(2, versions[1].VersionNumber);
        Assert.Equal("updated.pdf", versions[1].FileName);

        Assert.Equal(1, accounting.CheckQuotaCalls);
        Assert.Equal(1, accounting.RecordLedgerCalls);
    }

    [Fact]
    public async Task Handle_WhenQuotaFails_ReturnsErrorAndDoesNotCreateVersion()
    {
        var tenantId = Guid.NewGuid();
        var (db, documentId, _) = CreateDbWithDocument(tenantId);
        var accounting = new FakeStorageAccountingService
        {
            QuotaResult = ServiceResult<bool>.Failure(StatusCodes.Status507InsufficientStorage, "Quota exceeded")
        };
        var services = BuildServices(tenantId, db, accounting, new FakeDocumentStorageService());

        var handler = new AddDocumentVersionCommandHandler(services);
        var file = CreateFormFile("blocked.pdf", "application/pdf", new byte[] { 9, 9, 9 });

        var result = await handler.Handle(new AddDocumentVersionCommand(documentId, null, file), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status507InsufficientStorage, result.StatusCode);

        var persisted = await db.ProjectDocuments.SingleAsync(x => x.Id == documentId);
        Assert.Equal(1, persisted.CurrentVersionNumber);
        Assert.Equal("initial.pdf", persisted.FileName);
        Assert.Single(db.DocumentVersions.Where(x => x.ProjectDocumentId == documentId));
        Assert.Equal(1, accounting.CheckQuotaCalls);
        Assert.Equal(0, accounting.RecordLedgerCalls);
    }

    [Fact]
    public async Task Handle_WhenDatabasePersistenceFails_DeletesUploadedBlobAndKeepsHistory()
    {
        var tenantId = Guid.NewGuid();
        var interceptor = new FailNextSaveInterceptor();
        var (db, documentId, _) = CreateDbWithDocument(tenantId, interceptor);
        var storage = new FakeDocumentStorageService();
        var services = BuildServices(tenantId, db, new FakeStorageAccountingService(), storage);
        interceptor.FailNextSave = true;

        var handler = new AddDocumentVersionCommandHandler(services);
        var file = CreateFormFile("updated.pdf", "application/pdf", new byte[] { 1, 2, 3 });

        await Assert.ThrowsAsync<DbUpdateException>(async () =>
            await handler.Handle(new AddDocumentVersionCommand(documentId, "v2", file), CancellationToken.None));

        Assert.Equal("blob/updated.pdf", storage.DeletedBlobPath);
        db.ChangeTracker.Clear();
        var persisted = await db.ProjectDocuments.SingleAsync(x => x.Id == documentId);
        Assert.Equal(1, persisted.CurrentVersionNumber);
        Assert.Single(db.DocumentVersions.Where(x => x.ProjectDocumentId == documentId));
    }

    [Fact]
    public async Task Handle_WhenBlobUploadFails_DoesNotPersistAChange()
    {
        var tenantId = Guid.NewGuid();
        var (db, documentId, _) = CreateDbWithDocument(tenantId);
        var storage = new FakeDocumentStorageService { FailUpload = true };
        var accounting = new FakeStorageAccountingService();
        var services = BuildServices(tenantId, db, accounting, storage);

        var result = await new AddDocumentVersionCommandHandler(services).Handle(
            new AddDocumentVersionCommand(documentId, null, CreateFormFile("failed.pdf", "application/pdf", new byte[] { 1 })),
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Null(storage.DeletedBlobPath);
        Assert.Equal(0, accounting.RecordLedgerCalls);
        Assert.Equal(1, (await db.ProjectDocuments.SingleAsync(x => x.Id == documentId)).CurrentVersionNumber);
        Assert.Single(db.DocumentVersions.Where(x => x.ProjectDocumentId == documentId));
    }

    [Fact]
    public async Task Handle_NormalizesClientPathBeforeUploadAndPersistence()
    {
        var tenantId = Guid.NewGuid();
        var (db, documentId, _) = CreateDbWithDocument(tenantId);
        var storage = new FakeDocumentStorageService();
        var services = BuildServices(tenantId, db, new FakeStorageAccountingService(), storage);

        var result = await new AddDocumentVersionCommandHandler(services).Handle(
            new AddDocumentVersionCommand(documentId, null, CreateFormFile("../../safe.pdf", "application/pdf", new byte[] { 1 })),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("safe.pdf", storage.UploadedFileName);
        Assert.Equal("safe.pdf", (await db.ProjectDocuments.SingleAsync(x => x.Id == documentId)).FileName);
    }

    [Fact]
    public void BuildServices_RegistersEveryHandlerDependency()
    {
        var tenantId = Guid.NewGuid();
        var (db, _, _) = CreateDbWithDocument(tenantId);
        using var services = BuildServices(
            tenantId,
            db,
            new FakeStorageAccountingService(),
            new FakeDocumentStorageService());

        Assert.NotNull(services.GetRequiredService<AppDbContext>());
        Assert.NotNull(services.GetRequiredService<IDocumentStorageService>());
        Assert.NotNull(services.GetRequiredService<IStorageAccountingService>());
        Assert.NotNull(services.GetRequiredService<ICurrentTenantProvider>());
        Assert.NotNull(services.GetRequiredService<IHttpContextAccessor>());
        Assert.NotNull(services.GetRequiredService<IAuditLogger>());
    }

    private static ServiceProvider BuildServices(
        Guid tenantId,
        AppDbContext db,
        FakeStorageAccountingService accounting,
        FakeDocumentStorageService storage)
    {
        var userId = Guid.NewGuid();
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "test"))
            }
        };

        var services = new ServiceCollection();
        services.AddSingleton(db);
        services.AddSingleton<IDocumentStorageService>(storage);
        services.AddSingleton<IStorageAccountingService>(accounting);
        services.AddSingleton<ICurrentTenantProvider>(new FixedTenantProvider(tenantId));
        services.AddSingleton<IHttpContextAccessor>(accessor);
        services.AddSingleton<IAuditLogger>(new FakeAuditLogger());

        return services.BuildServiceProvider();
    }

    private static (AppDbContext db, Guid documentId, Guid originalVersionId) CreateDbWithDocument(
        Guid tenantId,
        SaveChangesInterceptor? interceptor = null)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString());
        if (interceptor is not null)
            optionsBuilder.AddInterceptors(interceptor);
        var options = optionsBuilder.Options;
        var db = new AppDbContext(options);

        var projectId = Guid.NewGuid();
        var documentId = Guid.NewGuid();
        var versionId = Guid.NewGuid();

        db.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = Guid.NewGuid(),
            ProjectNumber = "PRJ-100",
            Name = "Project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        });

        db.ProjectDocuments.Add(new ProjectDocument
        {
            Id = documentId,
            TenantId = tenantId,
            ProjectId = projectId,
            DocumentNumber = "DOC-001",
            Title = "Initial",
            FileName = "initial.pdf",
            ContentType = "application/pdf",
            StoragePath = "blob/initial",
            FileSizeBytes = 10,
            CurrentVersionNumber = 1,
            Status = ManagedDocumentStatus.Draft,
            IsActive = true
        });

        db.DocumentVersions.Add(new DocumentVersion
        {
            Id = versionId,
            TenantId = tenantId,
            ProjectDocumentId = documentId,
            VersionNumber = 1,
            FileName = "initial.pdf",
            ContentType = "application/pdf",
            StoragePath = "blob/initial",
            FileSizeBytes = 10,
            IsActive = true
        });

        db.SaveChanges();
        return (db, documentId, versionId);
    }

    private static IFormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.LongLength, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private sealed class FakeDocumentStorageService : IDocumentStorageService
    {
        public string? DeletedBlobPath { get; private set; }
        public string? UploadedFileName { get; private set; }
        public bool FailUpload { get; init; }

        public Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
            Guid tenantId,
            string sourceType,
            string fileName,
            Stream content,
            string contentType,
            CancellationToken cancellationToken = default)
        {
            UploadedFileName = fileName;
            return Task.FromResult(FailUpload
                ? ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status502BadGateway, "Storage unavailable")
                : ServiceResult<DocumentStorageUploadResult>.Success(
                    new DocumentStorageUploadResult($"blob/{fileName}", $"https://blob/{fileName}", content.Length, "sha256")));
        }

        public Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<string>.Failure(StatusCodes.Status501NotImplemented, "Not needed"));

        public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
            => Task.FromResult(ServiceResult<byte[]>.Failure(StatusCodes.Status501NotImplemented, "Not needed"));

        public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
        {
            DeletedBlobPath = blobPath;
            return Task.FromResult(ServiceResult<bool>.Success(true));
        }
    }

    private sealed class FailNextSaveInterceptor : SaveChangesInterceptor
    {
        public bool FailNextSave { get; set; }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (FailNextSave)
            {
                FailNextSave = false;
                throw new DbUpdateException("Simulated database persistence failure.");
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private sealed class FakeStorageAccountingService : IStorageAccountingService
    {
        public int CheckQuotaCalls { get; private set; }
        public int RecordLedgerCalls { get; private set; }
        public ServiceResult<bool> QuotaResult { get; set; } = ServiceResult<bool>.Success(true);

        public Task<ServiceResult<bool>> CheckQuotaAsync(
            Guid tenantId,
            long incomingFileSizeBytes,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            CheckQuotaCalls++;
            return Task.FromResult(QuotaResult);
        }

        public Task RecordLedgerEntryAsync(
            Guid tenantId,
            long deltaBytes,
            string operationType,
            Guid? projectId,
            Guid? projectDocumentId,
            Guid? performedByUserId,
            string? reference,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            RecordLedgerCalls++;
            return Task.CompletedTask;
        }
    }

    private sealed class FixedTenantProvider(Guid? tenantId) : ICurrentTenantProvider
    {
        public Guid? TenantId { get; } = tenantId;
    }

    private sealed class FakeAuditLogger : IAuditLogger
    {
        public Task LogAsync(
            string eventType,
            Guid? tenantId,
            Guid? actorUserId,
            Guid? targetUserId,
            string? entityName,
            string? entityId,
            string? description,
            object? metadata = null,
            CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
