using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class TaxCodeHandlerBase(IServiceProvider serviceProvider)
{
    protected AppDbContext DbContext => serviceProvider.GetRequiredService<AppDbContext>();

    protected ICurrentTenantProvider CurrentTenantProvider => serviceProvider.GetRequiredService<ICurrentTenantProvider>();

    protected Guid? TenantId => CurrentTenantProvider.TenantId;

    protected static ServiceResult<T> MissingTenant<T>()
    {
        return ServiceResult<T>.Failure(400, "Tenant context is required.");
    }

    protected static ServiceResult<bool> MissingTenantDelete()
    {
        return ServiceResult<bool>.Failure(400, "Tenant context is required.");
    }

    protected async Task<bool> HasDuplicateCodeAsync(Guid tenantId, string code, Guid? excludeId, CancellationToken cancellationToken)
    {
        return await DbContext.TaxCodes.AnyAsync(
            x => x.TenantId == tenantId && x.Code == code && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }
}
