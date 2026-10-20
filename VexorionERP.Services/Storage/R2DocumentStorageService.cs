using Amazon.S3;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace VexorionERP.Services;

public sealed partial class R2DocumentStorageService(
    IR2ObjectClient client,
    IOptions<StorageOptions> options) : IDocumentStorageService
{
    private readonly R2StorageOptions _options = options.Value.R2;

    public async Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
        Guid tenantId,
        string sourceType,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        if (tenantId == Guid.Empty)
            return Failure<DocumentStorageUploadResult>(StatusCodes.Status400BadRequest, "Tenant id is required.");
        if (string.IsNullOrWhiteSpace(sourceType))
            return Failure<DocumentStorageUploadResult>(StatusCodes.Status400BadRequest, "Source type is required.");
        if (string.IsNullOrWhiteSpace(fileName))
            return Failure<DocumentStorageUploadResult>(StatusCodes.Status400BadRequest, "File name is required.");
        if (string.IsNullOrWhiteSpace(_options.DocumentBucketName))
            return MissingConfiguration<DocumentStorageUploadResult>("Storage:R2:DocumentBucketName");

        var safeFileName = SanitizeFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeFileName))
            return Failure<DocumentStorageUploadResult>(StatusCodes.Status400BadRequest, "File name must contain a valid file name.");

        var safeSourceType = SanitizePathSegment(sourceType);
        if (string.IsNullOrWhiteSpace(safeSourceType))
            return Failure<DocumentStorageUploadResult>(StatusCodes.Status400BadRequest, "Source type must contain letters or numbers.");

        try
        {
            await using var memory = new MemoryStream();
            await content.CopyToAsync(memory, cancellationToken);
            var checksum = Convert.ToHexString(SHA256.HashData(memory.ToArray()));
            memory.Position = 0;

            var objectKey = $"{tenantId:D}/documents/{safeSourceType}/{Guid.NewGuid():N}/{safeFileName}";
            var canonicalContentType = CanonicalContentType(contentType);
            await client.PutAsync(
                _options.DocumentBucketName,
                objectKey,
                memory,
                canonicalContentType,
                cancellationToken);

            var lifetimeMinutes = _options.SignedUrlLifetimeMinutes > 0 ? _options.SignedUrlLifetimeMinutes : 5;
            var initialDownloadUrl = client.CreatePresignedReadUrl(
                _options.DocumentBucketName,
                objectKey,
                TimeSpan.FromMinutes(lifetimeMinutes),
                AzureBlobDocumentStorageService.CreateAttachmentContentDisposition(safeFileName),
                canonicalContentType);

            return ServiceResult<DocumentStorageUploadResult>.Success(new(
                objectKey,
                initialDownloadUrl,
                memory.Length,
                checksum));
        }
        catch (AmazonS3Exception)
        {
            return StorageUnavailable<DocumentStorageUploadResult>();
        }
    }

    public async Task<ServiceResult<string>> GetDownloadUrlAsync(
        string blobPath,
        string? downloadFileName = null,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
            return Failure<string>(StatusCodes.Status400BadRequest, "Blob path is required.");
        if (string.IsNullOrWhiteSpace(_options.DocumentBucketName))
            return MissingConfiguration<string>("Storage:R2:DocumentBucketName");

        try
        {
            if (!await client.ExistsAsync(_options.DocumentBucketName, blobPath, cancellationToken))
                return Failure<string>(StatusCodes.Status404NotFound, "Document blob was not found.");

            var lifetimeMinutes = _options.SignedUrlLifetimeMinutes > 0 ? _options.SignedUrlLifetimeMinutes : 5;
            var disposition = string.IsNullOrWhiteSpace(downloadFileName)
                ? null
                : AzureBlobDocumentStorageService.CreateAttachmentContentDisposition(downloadFileName);
            var url = client.CreatePresignedReadUrl(
                _options.DocumentBucketName,
                blobPath,
                TimeSpan.FromMinutes(lifetimeMinutes),
                disposition,
                string.IsNullOrWhiteSpace(contentType) ? null : contentType);
            return ServiceResult<string>.Success(url);
        }
        catch (AmazonS3Exception)
        {
            return StorageUnavailable<string>();
        }
    }

    public async Task<ServiceResult<byte[]>> DownloadAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
            return Failure<byte[]>(StatusCodes.Status400BadRequest, "Blob path is required.");
        if (string.IsNullOrWhiteSpace(_options.DocumentBucketName))
            return MissingConfiguration<byte[]>("Storage:R2:DocumentBucketName");

        try
        {
            if (!await client.ExistsAsync(_options.DocumentBucketName, blobPath, cancellationToken))
                return Failure<byte[]>(StatusCodes.Status404NotFound, "Document blob was not found.");
            return ServiceResult<byte[]>.Success(
                await client.DownloadAsync(_options.DocumentBucketName, blobPath, cancellationToken));
        }
        catch (AmazonS3Exception)
        {
            return StorageUnavailable<byte[]>();
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(string blobPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobPath))
            return Failure<bool>(StatusCodes.Status400BadRequest, "Blob path is required.");
        if (string.IsNullOrWhiteSpace(_options.DocumentBucketName))
            return MissingConfiguration<bool>("Storage:R2:DocumentBucketName");

        try
        {
            await client.DeleteAsync(_options.DocumentBucketName, blobPath, cancellationToken);
            return ServiceResult<bool>.Success(true);
        }
        catch (AmazonS3Exception)
        {
            return StorageUnavailable<bool>();
        }
    }

    internal static string SanitizePathSegment(string value) =>
        UnsafePathCharacterRegex().Replace(value.Trim().ToLowerInvariant(), "-").Trim('-');

    internal static string SanitizeFileName(string value)
    {
        var fileName = Path.GetFileName(value.Replace('\\', '/'));
        var lineBreakIndex = fileName.IndexOfAny(['\r', '\n']);
        return lineBreakIndex < 0 ? fileName : fileName[..lineBreakIndex];
    }

    private static string CanonicalContentType(string contentType) =>
        string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType.Trim().ToLowerInvariant();

    private static ServiceResult<T> Failure<T>(int statusCode, string message) =>
        ServiceResult<T>.Failure(statusCode, message);

    private static ServiceResult<T> MissingConfiguration<T>(string key) =>
        Failure<T>(StatusCodes.Status500InternalServerError, $"Missing required configuration: {key}");

    private static ServiceResult<T> StorageUnavailable<T>() =>
        Failure<T>(StatusCodes.Status503ServiceUnavailable,
            "Document storage is currently unavailable. Contact an administrator and provide the request trace ID.");

    [GeneratedRegex("[^a-z0-9_-]+")]
    private static partial Regex UnsafePathCharacterRegex();
}
