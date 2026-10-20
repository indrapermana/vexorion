namespace VexorionERP.Services;

public interface IR2ObjectClient
{
    Task PutAsync(string bucketName, string objectKey, Stream content, string contentType, CancellationToken cancellationToken);
    Task<bool> ExistsAsync(string bucketName, string objectKey, CancellationToken cancellationToken);
    string CreatePresignedReadUrl(
        string bucketName,
        string objectKey,
        TimeSpan lifetime,
        string? contentDisposition,
        string? contentType);
    Task<byte[]> DownloadAsync(string bucketName, string objectKey, CancellationToken cancellationToken);
    Task DeleteAsync(string bucketName, string objectKey, CancellationToken cancellationToken);
}
