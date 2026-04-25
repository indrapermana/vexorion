using VexorionERP.Database.Abstractions;

namespace VexorionERP.Services.Tests.Support;

internal sealed class FixedTenantProvider(Guid tenantId) : ICurrentTenantProvider
{
    public Guid? TenantId { get; } = tenantId;
}