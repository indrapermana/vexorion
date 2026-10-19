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

public class UploadProjectDocumentCommandHandlerTests
{
    [Fact]
    public async Task Handle_WhenValid_PersistsDocumentAndInitialVersion()
    {
        var tenantId = Guid.NewGuid();
        var (db, projectId) = CreateDbWithProject(tenantId);
        var storage = new FakeDocumentStorageService();
        var accounting = new FakeStorageAccountingService();
        using var services = BuildServices(tenantId, db, accounting, storage);

        var result = await new UploadProjectDocumentCommandHandler(services).Handle(
            CreateCommand(projectId, "initial.pdf"),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        var document = await db.ProjectDocuments.SingleAsync();
        var version = await db.DocumentVersions.SingleAsync();
        Assert.Equal(result.Value!.Id, document.Id);
        Assert.Equal(document.Id, version.ProjectDocumentId);
        Assert.Equal(1, document.CurrentVersionNumber);
        Assert.Equal(1, version.VersionNumber);
        Assert.Equal(document.StoragePath, version.StoragePath);
        Assert.Equal(1, accounting.CheckQuotaCalls);
        Assert.Equal(1, accounting.RecordLedgerCalls);
        Assert.Null(storage.DeletedBlobPath);
    }

    [Fact]
    public async Task Handle_WhenDatabasePersistenceFails_DeletesUploadedBlobAndPersistsNothing()
    {
        var tenantId = Guid.NewGuid();
        var interceptor = new FailNextSaveInterceptor();
        var (db, projectId) = CreateDbWithProject(tenantId, interceptor);
        var storage = new FakeDocumentStorageService();
        using var services = BuildServices(tenantId, db, new FakeStorageAccountingService(), storage);
        interceptor.FailNextSave = true;

        await Assert.ThrowsAsync<DbUpdateException>(async () =>
            await new UploadProjectDocumentCommandHandler(services).Handle(
                CreateCommand(projectId, "initial.pdf"),
                CancellationToken.None));

        Assert.Equal("blob/1/initial.pdf", storage.DeletedBlobPath);
        db.ChangeTracker.Clear();
        Assert.Empty(await db.ProjectDocuments.ToListAsync());
        Assert.Empty(await db.DocumentVersions.ToListAsync());
    }

    [Fact]
    public async Task Handle_WhenBlobUploadFails_DoesNotPersistDocumentOrLedger()
    {
        var tenantId = Guid.NewGuid();
        var (db, projectId) = CreateDbWithProject(tenantId);
        var storage = new FakeDocumentStorageService { FailUpload = true };
        var accounting = new FakeStorageAccountingService();
        using var services = BuildServices(tenantId, db, accounting, storage);

        var result = await new UploadProjectDocumentCommandHandler(services).Handle(
            CreateCommand(projectId, "failed.pdf"),
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.Empty(await db.ProjectDocuments.ToListAsync());
        Assert.Empty(await db.DocumentVersions.ToListAsync());
        Assert.Equal(0, accounting.RecordLedgerCalls);
        Assert.Null(storage.DeletedBlobPath);
    }

    [Fact]
    public async Task Handle_WhenSecurityValidationFails_DoesNotUploadOrPersist()
    {
        var tenantId = Guid.NewGuid();
        var (db, projectId) = CreateDbWithProject(tenantId);
        var storage = new FakeDocumentStorageService();
        using var services = BuildServices(
            tenantId,
            db,
            new FakeStorageAccountingService(),
            storage,
            ServiceResult<DocumentUploadSecurityResult>.Failure(
                StatusCodes.Status422UnprocessableEntity,
                "The file was rejected because malware was detected.",
                "document.malware_detected"));

        var result = await new UploadProjectDocumentCommandHandler(services).Handle(
            CreateCommand(projectId, "infected.pdf"),
            CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal("document.malware_detected", result.ErrorCode);
        Assert.Equal(0, storage.UploadCalls);
        Assert.Empty(await db.ProjectDocuments.ToListAsync());
    }

    [Fact]
    public async Task Handle_AfterConfirmedDatabaseFailure_CanBeRetriedWithoutDuplicatePersistence()
    {
        var tenantId = Guid.NewGuid();
        var interceptor = new FailNextSaveInterceptor();
        var (db, projectId) = CreateDbWithProject(tenantId, interceptor);
        var storage = new FakeDocumentStorageService();
        using var services = BuildServices(tenantId, db, new FakeStorageAccountingService(), storage);
        var handler = new UploadProjectDocumentCommandHandler(services);
        interceptor.FailNextSave = true;

        await Assert.ThrowsAsync<DbUpdateException>(async () =>
            await handler.Handle(CreateCommand(projectId, "retry.pdf"), CancellationToken.None));
        db.ChangeTracker.Clear(); // A real HTTP retry receives a new scoped DbContext.

        var retry = await handler.Handle(CreateCommand(projectId, "retry.pdf"), CancellationToken.None);

        Assert.True(retry.Succeeded);
        Assert.Equal(2, storage.UploadCalls);
        Assert.Equal("blob/1/retry.pdf", storage.DeletedBlobPath);
        Assert.Single(await db.ProjectDocuments.ToListAsync());
        Assert.Single(await db.DocumentVersions.ToListAsync());
    }

    [Fact]
    public async Task Handle_NormalizesClientPathBeforeUploadAndPersistence()
    {
        var tenantId = Guid.NewGuid();
        var (db, projectId) = CreateDbWithProject(tenantId);
        var storage = new FakeDocumentStorageService();
        using var services = BuildServices(tenantId, db, new FakeStorageAccountingService(), storage);

        var result = await new UploadProjectDocumentCommandHandler(services).Handle(
            CreateCommand(projectId, "../../safe.pdf"),
            CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal("safe.pdf", storage.UploadedFileName);
        Assert.Equal("safe.pdf", (await db.ProjectDocuments.SingleAsync()).FileName);
        Assert.Equal("safe.pdf", (await db.DocumentVersions.SingleAsync()).FileName);
    }

    [Fact]
    public void BuildServices_RegistersEveryHandlerDependency()
    {
        var tenantId = Guid.NewGuid();
        var (db, _) = CreateDbWithProject(tenantId);
        using var services = BuildServices(
            tenantId,
            db,
            new FakeStorageAccountingService(),
            new FakeDocumentStorageService());

        Assert.NotNull(services.GetRequiredService<AppDbContext>());
        Assert.NotNull(services.GetRequiredService<IDocumentStorageService>());
        Assert.NotNull(services.GetRequiredService<IDocumentUploadSecurityService>());
        Assert.NotNull(services.GetRequiredService<IStorageAccountingService>());
        Assert.NotNull(services.GetRequiredService<ICurrentTenantProvider>());
        Assert.NotNull(services.GetRequiredService<IHttpContextAccessor>());
        Assert.NotNull(services.GetRequiredService<IAuditLogger>());
    }

    private static UploadProjectDocumentCommand CreateCommand(Guid projectId, string fileName) =>
        new(
            projectId,
            null,
            "Initial document",
            "test",
            "Initial upload",
            CreateFormFile(fileName, "application/pdf", [1, 2, 3]));

    private static ServiceProvider BuildServices(
        Guid tenantId,
        AppDbContext db,
        FakeStorageAccountingService accounting,
        FakeDocumentStorageService storage,
        ServiceResult<DocumentUploadSecurityResult>? securityResult = null)
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())],
                    "test"))
            }
        };

        return new ServiceCollection()
            .AddSingleton(db)
            .AddSingleton<IDocumentStorageService>(storage)
            .AddSingleton<IDocumentUploadSecurityService>(new FakeDocumentUploadSecurityService(securityResult))
            .AddSingleton<IStorageAccountingService>(accounting)
            .AddSingleton<ICurrentTenantProvider>(new FixedTenantProvider(tenantId))
            .AddSingleton<IHttpContextAccessor>(accessor)
            .AddSingleton<IAuditLogger>(new FakeAuditLogger())
            .BuildServiceProvider();
    }

    private static (AppDbContext Db, Guid ProjectId) CreateDbWithProject(
        Guid tenantId,
        SaveChangesInterceptor? interceptor = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString());
        if (interceptor is not null)
            options.AddInterceptors(interceptor);

        var db = new AppDbContext(options.Options);
        var projectId = Guid.NewGuid();
        db.Projects.Add(new Project
        {
            Id = projectId,
            TenantId = tenantId,
            ProjectCategoryId = Guid.NewGuid(),
            ProjectNumber = "PRJ-UPLOAD",
            Name = "Upload project",
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = ProjectLifecycleStatus.Draft
        });
        db.SaveChanges();
        return (db, projectId);
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
        public int UploadCalls { get; private set; }
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
            UploadCalls++;
            UploadedFileName = fileName;
            return Task.FromResult(FailUpload
                ? ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status502BadGateway, "Storage unavailable")
                : ServiceResult<DocumentStorageUploadResult>.Success(new DocumentStorageUploadResult(
                    $"blob/{UploadCalls}/{fileName}",
                    $"https://blob/{UploadCalls}/{fileName}",
                    content.Length,
                    "sha256")));
        }

        public Task<ServiceResult<string>> GetDownloadUrlAsync(
            string blobPath,
            string? downloadFileName = null,
            string? contentType = null,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(ServiceResult<string>.Failure(StatusCodes.Status501NotImplemented, "Not needed"));

        public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default) =>
            Task.FromResult(ServiceResult<byte[]>.Failure(StatusCodes.Status501NotImplemented, "Not needed"));

        public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
        {
            DeletedBlobPath = blobPath;
            return Task.FromResult(ServiceResult<bool>.Success(true));
        }
    }

    private sealed class FakeDocumentUploadSecurityService(
        ServiceResult<DocumentUploadSecurityResult>? result = null) : IDocumentUploadSecurityService
    {
        public Task<ServiceResult<DocumentUploadSecurityResult>> ValidateAsync(
            IFormFile file,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(result ?? ServiceResult<DocumentUploadSecurityResult>.Success(
                new DocumentUploadSecurityResult(file.ContentType)));
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

        public Task<ServiceResult<bool>> CheckQuotaAsync(
            Guid tenantId,
            long incomingFileSizeBytes,
            AppDbContext dbContext,
            CancellationToken cancellationToken = default)
        {
            CheckQuotaCalls++;
            return Task.FromResult(ServiceResult<bool>.Success(true));
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
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
