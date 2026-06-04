using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class ActivateTenantRelationshipRequest
{
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }

    [StringLength(8000)]
    public string? ScopeJson { get; set; }
}
