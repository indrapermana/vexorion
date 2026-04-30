using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class SupplierQueryService(
    ICurrentTenantProvider currentTenantProvider) : BaseService(currentTenantProvider), IQueryService<Supplier>
{
    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var suppliers = await context.Suppliers.GetByTenant(tenantId.Value).AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<Supplier>>>.Success(AdaptEntityListResponses(suppliers));
    }

    public async Task<ServiceResult<IEntityResponse<Supplier>>> GetByIdAsync(Guid supplierId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
        {
            return ServiceResult<IEntityResponse<Supplier>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var supplier = await context.Suppliers.GetByTenant(tenantId.Value).AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplierId, cancellationToken);
        return supplier is null
            ? ServiceResult<IEntityResponse<Supplier>>.Failure(StatusCodes.Status404NotFound, "Supplier not found.")
            : ServiceResult<IEntityResponse<Supplier>>.Success(supplier.Adapt<SupplierDetailsResponse>());
    }
}
