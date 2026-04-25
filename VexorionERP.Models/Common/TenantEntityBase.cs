using VexorionERP.Models.Tenancy;

namespace VexorionERP.Models.Common;

public abstract class TenantEntityBase : EntityBase, ITenantEntity
{
    public Guid TenantId { get; set; }

    public Tenant? Tenant { get; set; }
}