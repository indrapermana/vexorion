using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateProjectPartyRequest : ICreateLineRequest<ProjectParty>
{
    public Guid RelatedTenantId { get; set; }
    public TenantRelationshipType RelationshipType { get; set; }
    public bool CanViewDocuments { get; set; }
    public bool CanUploadDocuments { get; set; }
    public bool CanAssignPeople { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
}
