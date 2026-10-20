using Amazon.S3;
using Amazon.S3.Model;

namespace VexorionERP.Services;

public sealed class R2ObjectClient(IAmazonS3 client) : IR2ObjectClient
{
    public async Task PutAsync(
        string bucketName,
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken)
    {
        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        }, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string bucketName, string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            await client.GetObjectMetadataAsync(bucketName, objectKey, cancellationToken);
            return true;
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public string CreatePresignedReadUrl(
        string bucketName,
        string objectKey,
        TimeSpan lifetime,
        string? contentDisposition,
        string? contentType)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = bucketName,
            Key = objectKey,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(lifetime),
        };

        if (!string.IsNullOrWhiteSpace(contentDisposition))
            request.ResponseHeaderOverrides.ContentDisposition = contentDisposition;
        if (!string.IsNullOrWhiteSpace(contentType))
            request.ResponseHeaderOverrides.ContentType = contentType;

        return client.GetPreSignedURL(request);
    }

    public async Task<byte[]> DownloadAsync(string bucketName, string objectKey, CancellationToken cancellationToken)
    {
        using var response = await client.GetObjectAsync(bucketName, objectKey, cancellationToken);
        await using var memory = new MemoryStream();
        await response.ResponseStream.CopyToAsync(memory, cancellationToken);
        return memory.ToArray();
    }

    public async Task DeleteAsync(string bucketName, string objectKey, CancellationToken cancellationToken)
    {
        await client.DeleteObjectAsync(bucketName, objectKey, cancellationToken);
    }
}
