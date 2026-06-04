using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ChangeProjectDocumentStatusRequest
{
    [Required]
    public ManagedDocumentStatus NewStatus { get; set; }

    [StringLength(1000)]
    public string? Reason { get; set; }
}
