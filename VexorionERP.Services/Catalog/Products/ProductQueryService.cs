using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class ProductQueryService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IProductQueryService
{
    public async Task<ServiceResult<IReadOnlyCollection<ProductListItemResponse>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProductListItemResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var products = await dbContext.Products
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProductListItemResponse>>.Success(products.Adapt<IReadOnlyCollection<ProductListItemResponse>>());
    }

    public async Task<ServiceResult<ProductDetailsResponse>> GetByIdAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var product = await dbContext.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);

        return product is null
            ? ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Product not found.")
            : ServiceResult<ProductDetailsResponse>.Success(product.Adapt<ProductDetailsResponse>());
    }
}
