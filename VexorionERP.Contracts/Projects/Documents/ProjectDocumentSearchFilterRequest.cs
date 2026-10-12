using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectDocumentSearchFilterRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? ProjectCategoryId { get; set; }
    public ManagedDocumentStatus? Status { get; set; }
    public string? Tag { get; set; }
    public string? SearchTerm { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
}
