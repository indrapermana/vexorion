using VexorionERP.Models.Tenancy;

namespace VexorionERP.Models.Common;

public interface ITenantEntity
{
    Guid TenantId { get; set; }

    Tenant? Tenant { get; set; }
}