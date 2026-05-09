using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProjectDocument : TenantEntityBase
{
    public Guid ProjectId { get; set; }
    public Guid? DocumentFolderId { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int CurrentVersionNumber { get; set; } = 1;
    public ManagedDocumentStatus Status { get; set; } = ManagedDocumentStatus.Draft;
    public string? Tags { get; set; }
    public string? Notes { get; set; }

    public Project? Project { get; set; }
    public DocumentFolder? Folder { get; set; }
    public ICollection<DocumentVersion> Versions { get; set; } = [];
    public ICollection<DocumentAccessPolicy> AccessPolicies { get; set; } = [];
}