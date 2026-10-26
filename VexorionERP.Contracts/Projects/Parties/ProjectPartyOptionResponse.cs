using VexorionERP.Models;

namespace VexorionERP.Contracts;

public sealed record ProjectPartyOptionResponse(
    Guid RelatedTenantId,
    string RelatedTenantCode,
    string RelatedTenantName,
    TenantRelationshipType RelationshipType,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    bool CanViewDocuments,
    bool CanUploadDocuments,
    bool CanAssignPeople);