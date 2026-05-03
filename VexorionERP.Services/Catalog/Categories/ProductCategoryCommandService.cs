using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductCategoryCommandService : BaseCommandService<ProductCategory>
{
    public ProductCategoryCommandService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    protected override async Task<ServiceResult<IEntityResponse<ProductCategory>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<ProductCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProductCategoryRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalized = request.Name.Trim().ToUpperInvariant();
        var exists = await context.ProductCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.NormalizedName == normalized, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<ProductCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A product category with the same name already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<ProductCategory>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<ProductCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProductCategoryRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalized = request.Name.Trim().ToUpperInvariant();
        var exists = await context.ProductCategories
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.NormalizedName == normalized && x.Id != id, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<ProductCategory>>.Failure(
                StatusCodes.Status409Conflict,
                "A product category with the same name already exists.");
        }

        return null;
    }

    public override Task<ProductCategory> GetAddToDbObjectAsync(
        ICreateInput<ProductCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProductCategoryRequest)input;
        var entity = new ProductCategory
        {
            Name = request.Name.Trim(),
            NormalizedName = request.Name.Trim().ToUpperInvariant()
        };
        return Task.FromResult(entity);
    }

    protected override async Task<ProductCategory> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<ProductCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProductCategoryRequest)input;
        var entity = await context.ProductCategories.GetByTenant(TenantId).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null!;
        }

        entity.Name = request.Name.Trim();
        entity.NormalizedName = request.Name.Trim().ToUpperInvariant();
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<ProductCategory> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.ProductCategories.GetByTenant(TenantId).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity!;
    }
}
