using VexorionERP.Models;

namespace VexorionERP.Models;

public interface ITenantEntity
{
    Guid TenantId { get; set; }

    Tenant? Tenant { get; set; }
}
