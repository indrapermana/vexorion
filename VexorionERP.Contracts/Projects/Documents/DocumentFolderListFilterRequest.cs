namespace VexorionERP.Contracts;

public class DocumentFolderListFilterRequest
{
    public Guid? ProjectId { get; set; }
    public Guid? ParentFolderId { get; set; }
}
