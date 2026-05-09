using VexorionERP.Models;

namespace VexorionERP.Models;

public class ProjectParty : TenantEntityBase
{
    public Guid ProjectId { get; set; }
    public Guid RelatedTenantId { get; set; }
    public TenantRelationshipType RelationshipType { get; set; }
    public bool CanViewDocuments { get; set; }
    public bool CanUploadDocuments { get; set; }
    public bool CanAssignPeople { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }

    public Project? Project { get; set; }
    public Tenant? RelatedTenant { get; set; }
}