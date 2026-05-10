using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class ProjectPartyDetailsResponse : ILineResponse<ProjectParty>
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid RelatedTenantId { get; set; }
    public TenantRelationshipType RelationshipType { get; set; }
    public bool CanViewDocuments { get; set; }
    public bool CanUploadDocuments { get; set; }
    public bool CanAssignPeople { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; }
}
