using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Web.Tests;

public sealed class GeneratedDocumentsTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    private readonly string _databaseName = $"vexorion-generated-document-tests-{Guid.NewGuid()}";
    private readonly InMemoryDatabaseRoot _databaseRoot = new();

    public FakeDocumentStorageService Storage { get; } = new();

    protected override string GetDatabaseName() => _databaseName;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<IDocumentStorageService>();

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName, _databaseRoot));
            services.AddSingleton<IDocumentStorageService>(Storage);
        });
    }
}

public sealed class FakeDocumentStorageService : IDocumentStorageService
{
    private readonly Dictionary<string, (byte[] Content, string ContentType)> _objects = new();

    public int DownloadRequestCount { get; private set; }
    public int DownloadUrlRequestCount { get; private set; }
    public int UploadRequestCount { get; private set; }

    public void Add(string blobPath, byte[] content, string contentType) =>
        _objects[blobPath] = (content, contentType);

    public Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
        Guid tenantId,
        string sourceType,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        UploadRequestCount++;
        var blobPath = $"{tenantId:N}/{sourceType}/{fileName}";
        using var memory = new MemoryStream();
        content.CopyTo(memory);
        _objects[blobPath] = (memory.ToArray(), contentType);

        return Task.FromResult(ServiceResult<DocumentStorageUploadResult>.Success(
            new DocumentStorageUploadResult(blobPath, $"https://storage.test/{blobPath}", memory.Length, "test-checksum")));
    }

    public Task<ServiceResult<string>> GetDownloadUrlAsync(
        string blobPath,
        string? downloadFileName = null,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        DownloadUrlRequestCount++;
        return Task.FromResult(_objects.ContainsKey(blobPath)
            ? ServiceResult<string>.Success($"https://storage.test/{blobPath}?download=1")
            : ServiceResult<string>.Failure(404, "Object not found."));
    }

    public Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        DownloadRequestCount++;
        return Task.FromResult(_objects.TryGetValue(blobPath, out var stored)
            ? ServiceResult<byte[]>.Success(stored.Content)
            : ServiceResult<byte[]>.Failure(404, "Object not found."));
    }

    public Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(ServiceResult<bool>.Success(_objects.Remove(blobPath)));
    }
}
