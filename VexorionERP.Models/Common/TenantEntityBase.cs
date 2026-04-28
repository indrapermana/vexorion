using VexorionERP.Models;

namespace VexorionERP.Models;

public abstract class TenantEntityBase : EntityBase, ITenantEntity
{
    public Guid TenantId { get; set; }

    public Tenant? Tenant { get; set; }
}
