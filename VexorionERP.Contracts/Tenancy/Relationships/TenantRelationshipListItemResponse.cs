using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class TenantRelationshipListItemResponse : IEntityListResponse<TenantRelationship>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid RelatedTenantId { get; set; }
    public TenantRelationshipType RelationshipType { get; set; }
    public TenantRelationshipStatus Status { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? ContractReference { get; set; }
    public string? ScopeJson { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
