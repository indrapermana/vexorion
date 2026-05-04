using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class AzureBlobDocumentStorageService(IConfiguration configuration) : IDocumentStorageService
{
    private const string ConnectionStringKey = "AzureBlob:ConnectionString";
    private const string ContainerNameKey = "AzureBlob:DocumentContainerName";

    public async Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
        Guid tenantId,
        string sourceType,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (tenantId == Guid.Empty)
        {
            return ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status400BadRequest, "Tenant id is required.");
        }

        if (string.IsNullOrWhiteSpace(sourceType))
        {
            return ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status400BadRequest, "Source type is required.");
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            return ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status400BadRequest, "File name is required.");
        }

        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return ServiceResult<DocumentStorageUploadResult>.Failure(StatusCodes.Status500InternalServerError, $"Missing required configuration: {ConnectionStringKey}");
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "generated-documents";
        }

        await using var memory = new MemoryStream();
        await content.CopyToAsync(memory, cancellationToken);
        memory.Position = 0;

        var checksum = ComputeSha256(memory);
        memory.Position = 0;

        var safeFileName = Path.GetFileName(fileName);
        var blobPath = $"{tenantId:D}/documents/{sourceType.Trim().ToLowerInvariant()}/{Guid.NewGuid():N}/{safeFileName}";

        var containerClient = new BlobContainerClient(connectionString, containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: cancellationToken);

        var blobClient = containerClient.GetBlobClient(blobPath);
        await blobClient.UploadAsync(memory, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            },
        }, cancellationToken);

        var result = new DocumentStorageUploadResult(
            BlobPath: blobPath,
            BlobUrl: blobClient.Uri.ToString(),
            FileSizeBytes: memory.Length,
            ChecksumSha256: checksum);

        return ServiceResult<DocumentStorageUploadResult>.Success(result);
    }

    public Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
        {
            return Task.FromResult(ServiceResult<string>.Failure(StatusCodes.Status400BadRequest, "Blob path is required."));
        }

        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Task.FromResult(ServiceResult<string>.Failure(StatusCodes.Status500InternalServerError, $"Missing required configuration: {ConnectionStringKey}"));
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "generated-documents";
        }

        var containerClient = new BlobContainerClient(connectionString, containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);
        return Task.FromResult(ServiceResult<string>.Success(blobClient.Uri.ToString()));
    }

    private static string ComputeSha256(Stream stream)
    {
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(stream);
        return Convert.ToHexString(hash);
    }
}
