using VexorionERP.Models;

namespace VexorionERP.Models;

public class TenantRelationship : TenantEntityBase
{
    public Guid RelatedTenantId { get; set; }
    public TenantRelationshipType RelationshipType { get; set; }
    public TenantRelationshipStatus Status { get; set; } = TenantRelationshipStatus.Pending;
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string? ContractReference { get; set; }
    public string? ScopeJson { get; set; }

    public Tenant? RelatedTenant { get; set; }
}