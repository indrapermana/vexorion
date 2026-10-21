namespace VexorionERP.Services;

public interface ITenantStorageCleanupService
{
    Task<ServiceResult<bool>> DeleteTenantObjectsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);
}
