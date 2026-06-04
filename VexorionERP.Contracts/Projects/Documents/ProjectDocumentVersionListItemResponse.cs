using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectDocumentVersionListItemResponse : IEntityListResponse<DocumentVersion>
{
    public Guid Id { get; set; }
    public Guid ProjectDocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Checksum { get; set; }
    public Guid? UploadedByUserId { get; set; }
    public DateTime UploadedAtUtc { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
}
