using VexorionERP.Services;

namespace VexorionERP.Services;

public record DocumentStorageUploadResult(
    string BlobPath,
    string BlobUrl,
    long FileSizeBytes,
    string ChecksumSha256);

public interface IDocumentStorageService
{
    Task<ServiceResult<DocumentStorageUploadResult>> UploadAsync(
        Guid tenantId,
        string sourceType,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    Task<ServiceResult<string>> GetDownloadUrlAsync(string blobPath, CancellationToken cancellationToken = default);
}
