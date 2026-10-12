using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectDocumentSearchItemResponse
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid ProjectCategoryId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ProjectNumber { get; set; } = string.Empty;
    public string ProjectCategoryCode { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int CurrentVersionNumber { get; set; }
    public ManagedDocumentStatus Status { get; set; }
    public string? Tags { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
