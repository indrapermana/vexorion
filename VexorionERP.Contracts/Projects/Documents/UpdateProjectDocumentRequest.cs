using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateProjectDocumentRequest : IUpdateInput<ProjectDocument>
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public Guid? DocumentFolderId { get; set; }

    [StringLength(500)]
    public string? Tags { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}
