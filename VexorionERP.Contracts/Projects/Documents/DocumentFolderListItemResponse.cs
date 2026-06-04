using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class DocumentFolderListItemResponse : IEntityListResponse<DocumentFolder>
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? ParentFolderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}
