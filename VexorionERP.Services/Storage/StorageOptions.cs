namespace VexorionERP.Services;

public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    public string Provider { get; set; } = StorageProviders.AzureBlob;
    public R2StorageOptions R2 { get; set; } = new();
}

public sealed class R2StorageOptions
{
    public string AccountId { get; set; } = string.Empty;
    public string DocumentBucketName { get; set; } = string.Empty;
    public string ProductImageBucketName { get; set; } = string.Empty;
    public string ProductImagePublicBaseUrl { get; set; } = string.Empty;
    public string AccessKeyId { get; set; } = string.Empty;
    public string SecretAccessKey { get; set; } = string.Empty;
    public int SignedUrlLifetimeMinutes { get; set; } = 5;
}

public static class StorageProviders
{
    public const string AzureBlob = "AzureBlob";
    public const string R2 = "R2";
}
