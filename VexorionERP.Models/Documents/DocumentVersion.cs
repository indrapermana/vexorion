using VexorionERP.Models;

namespace VexorionERP.Models;

public class DocumentVersion : TenantEntityBase
{
    public Guid ProjectDocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Checksum { get; set; }
    public Guid? UploadedByUserId { get; set; }
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public ProjectDocument? ProjectDocument { get; set; }
    public User? UploadedByUser { get; set; }
}