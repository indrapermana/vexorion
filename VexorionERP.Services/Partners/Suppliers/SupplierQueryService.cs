using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Partners.Suppliers;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class SupplierQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : ISupplierQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<SupplierListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<SupplierListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var suppliers = await dbContext.Suppliers.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return ServiceResult<IReadOnlyCollection<SupplierListItemResponse>>.Success(suppliers.Adapt<IReadOnlyCollection<SupplierListItemResponse>>());
    }

    public async Task<ServiceResult<SupplierDetailsResponse>> GetByIdAsync(Guid supplierId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var supplier = await dbContext.Suppliers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == supplierId, cancellationToken);
        return supplier is null
            ? ServiceResult<SupplierDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Supplier not found.")
            : ServiceResult<SupplierDetailsResponse>.Success(supplier.Adapt<SupplierDetailsResponse>());
    }
}