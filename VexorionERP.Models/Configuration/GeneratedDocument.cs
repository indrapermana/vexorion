using VexorionERP.Models;

namespace VexorionERP.Models;

public class GeneratedDocument : TenantEntityBase
{
    public GeneratedDocumentSourceType SourceType { get; set; }
    public Guid SourceEntityId { get; set; }
    public GeneratedDocumentFormat Format { get; set; }
    public GeneratedDocumentStatus Status { get; set; } = GeneratedDocumentStatus.Ready;
    public int Version { get; set; } = 1;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string BlobPath { get; set; } = string.Empty;
    public string ChecksumSha256 { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public Guid GeneratedByUserId { get; set; }
    public string? ErrorMessage { get; set; }
}