using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectDocumentListItemResponse : IEntityListResponse<ProjectDocument>
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? DocumentFolderId { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int CurrentVersionNumber { get; set; }
    public ManagedDocumentStatus Status { get; set; }
    public string? Tags { get; set; }
    public bool IsActive { get; set; }
}
