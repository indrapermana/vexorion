using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class AzureBlobDocumentStorageService(IConfiguration configuration) : IDocumentStorageService
{
    private const string ConnectionStringKey = "AzureBlob:ConnectionString";
    private const string ContainerNameKey = "AzureBlob:DocumentContainerName";
    private const string SignedUrlLifetimeMinutesKey = "AzureBlob:DocumentSignedUrlLifetimeMinutes";

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

        try
        {
            await using var memory = new MemoryStream();
            await content.CopyToAsync(memory, cancellationToken);
            memory.Position = 0;

            var checksum = ComputeSha256(memory);
            memory.Position = 0;

            var safeFileName = Path.GetFileName(fileName.Replace('\\', '/'));
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
        catch (Azure.RequestFailedException exception)
        {
            var message = exception.ErrorCode == "AccountIsDisabled"
                ? "Document storage is unavailable because the configured storage account is disabled. Contact an administrator."
                : "Document storage is currently unavailable. Contact an administrator and provide the request trace ID.";

            return ServiceResult<DocumentStorageUploadResult>.Failure(
                StatusCodes.Status503ServiceUnavailable,
                message);
        }
    }

    public async Task<ServiceResult<string>> GetDownloadUrlAsync(
        string blobPath,
        string? downloadFileName = null,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
        {
            return ServiceResult<string>.Failure(StatusCodes.Status400BadRequest, "Blob path is required.");
        }

        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return ServiceResult<string>.Failure(StatusCodes.Status500InternalServerError, $"Missing required configuration: {ConnectionStringKey}");
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "generated-documents";
        }

        var containerClient = new BlobContainerClient(connectionString, containerName);
        var blobClient = containerClient.GetBlobClient(blobPath);

        var exists = await blobClient.ExistsAsync(cancellationToken);
        if (!exists.Value)
        {
            return ServiceResult<string>.Failure(StatusCodes.Status404NotFound, "Document blob was not found.");
        }

        if (!blobClient.CanGenerateSasUri)
        {
            return ServiceResult<string>.Failure(
                StatusCodes.Status500InternalServerError,
                "Document blob client cannot generate a signed download URL with the current storage configuration.");
        }

        var lifetimeMinutes = ResolveSignedUrlLifetimeMinutes();
        var now = DateTimeOffset.UtcNow;
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = blobClient.BlobContainerName,
            BlobName = blobClient.Name,
            Resource = "b",
            StartsOn = now.AddMinutes(-1),
            ExpiresOn = now.AddMinutes(lifetimeMinutes),
        };
        if (!string.IsNullOrWhiteSpace(downloadFileName))
            sasBuilder.ContentDisposition = CreateAttachmentContentDisposition(downloadFileName);

        if (!string.IsNullOrWhiteSpace(contentType))
            sasBuilder.ContentType = contentType;

        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        return ServiceResult<string>.Success(blobClient.GenerateSasUri(sasBuilder).ToString());
    }

    public async Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
        {
            return ServiceResult<byte[]>.Failure(StatusCodes.Status400BadRequest, "Blob path is required.");
        }

        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return ServiceResult<byte[]>.Failure(StatusCodes.Status500InternalServerError, $"Missing required configuration: {ConnectionStringKey}");
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "generated-documents";
        }

        try
        {
            var containerClient = new BlobContainerClient(connectionString, containerName);
            var blobClient = containerClient.GetBlobClient(blobPath);

            var exists = await blobClient.ExistsAsync(cancellationToken);
            if (!exists.Value)
            {
                return ServiceResult<byte[]>.Failure(StatusCodes.Status404NotFound, "Document blob was not found.");
            }

            var content = await blobClient.DownloadContentAsync(cancellationToken);
            return ServiceResult<byte[]>.Success(content.Value.Content.ToArray());
        }
        catch (Exception ex)
        {
            return ServiceResult<byte[]>.Failure(StatusCodes.Status500InternalServerError, $"Failed to download document blob: {ex.Message}");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Blob path is required.");
        }

        var connectionString = configuration[ConnectionStringKey];
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status500InternalServerError, $"Missing required configuration: {ConnectionStringKey}");
        }

        var containerName = configuration[ContainerNameKey];
        if (string.IsNullOrWhiteSpace(containerName))
        {
            containerName = "generated-documents";
        }

        try
        {
            var blobClient = new BlobContainerClient(connectionString, containerName).GetBlobClient(blobPath);
            var deleted = await blobClient.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
            return ServiceResult<bool>.Success(deleted.Value);
        }
        catch (Exception ex)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status500InternalServerError, $"Failed to delete document blob: {ex.Message}");
        }
    }

    private static string ComputeSha256(Stream stream)
    {
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(stream);
        return Convert.ToHexString(hash);
    }

    internal static string CreateAttachmentContentDisposition(string fileName)
    {
        var safeFileName = Path.GetFileName(fileName.Replace('\\', '/'));
        var lineBreakIndex = safeFileName.IndexOfAny(['\r', '\n']);
        if (lineBreakIndex >= 0)
            safeFileName = safeFileName[..lineBreakIndex];
        return $"attachment; filename*=UTF-8''{Uri.EscapeDataString(safeFileName)}";
    }

    private int ResolveSignedUrlLifetimeMinutes()
    {
        var configuredValue = configuration[SignedUrlLifetimeMinutesKey];
        return int.TryParse(configuredValue, out var lifetimeMinutes) && lifetimeMinutes > 0
            ? lifetimeMinutes
            : 5;
    }
}
