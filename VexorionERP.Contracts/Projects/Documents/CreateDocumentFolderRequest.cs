using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateDocumentFolderRequest : ICreateInput<DocumentFolder>
{
    [Required]
    public Guid ProjectId { get; set; }

    public Guid? ParentFolderId { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }
}
