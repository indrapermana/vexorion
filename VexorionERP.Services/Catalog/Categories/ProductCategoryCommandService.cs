using Microsoft.AspNetCore.Http;
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
        var exists = context.ProductCategories
            .GetByTenant(tenantId.Value)
            .Any(x => x.NormalizedName == normalized);

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
        var exists = context.ProductCategories
            .GetByTenant(tenantId.Value)
            .Any(x => x.NormalizedName == normalized && x.Id != id);

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

    protected override Task<ProductCategory> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<ProductCategory> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProductCategoryRequest)input;
        var entity = context.ProductCategories.GetByTenant(TenantId).FirstOrDefault(x => x.Id == id);

        if (entity is null)
        {
            return Task.FromResult<ProductCategory>(null!);
        }

        entity.Name = request.Name.Trim();
        entity.NormalizedName = request.Name.Trim().ToUpperInvariant();
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return Task.FromResult(entity);
    }

    protected override Task<ProductCategory> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = context.ProductCategories.GetByTenant(TenantId).FirstOrDefault(x => x.Id == id);
        return Task.FromResult(entity!);
    }
}
