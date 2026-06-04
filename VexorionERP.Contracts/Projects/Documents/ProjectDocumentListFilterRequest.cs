using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectDocumentListFilterRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? DocumentFolderId { get; set; }
    public ManagedDocumentStatus? Status { get; set; }
    public string? SearchTerm { get; set; }
}
