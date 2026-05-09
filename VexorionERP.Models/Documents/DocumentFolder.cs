using VexorionERP.Models;

namespace VexorionERP.Models;

public class DocumentFolder : TenantEntityBase
{
    public Guid ProjectId { get; set; }
    public Guid? ParentFolderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Project? Project { get; set; }
    public DocumentFolder? ParentFolder { get; set; }
    public ICollection<DocumentFolder> Children { get; set; } = [];
    public ICollection<ProjectDocument> Documents { get; set; } = [];
}