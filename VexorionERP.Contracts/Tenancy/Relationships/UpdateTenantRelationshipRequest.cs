using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateTenantRelationshipRequest : IUpdateInput<TenantRelationship>
{
    [Required]
    public Guid RelatedTenantId { get; set; }

    [Required]
    public TenantRelationshipType RelationshipType { get; set; }

    [Required]
    public TenantRelationshipStatus Status { get; set; }

    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }

    [StringLength(100)]
    public string? ContractReference { get; set; }

    [StringLength(8000)]
    public string? ScopeJson { get; set; }
}
