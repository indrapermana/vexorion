using VexorionERP.Database;

namespace VexorionERP.Services;

internal sealed class FixedTenantProvider(Guid tenantId) : ICurrentTenantProvider
{
    public Guid? TenantId { get; } = tenantId;
}
