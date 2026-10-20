using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class ProductCommandService(
    ICurrentTenantProvider currentTenantProvider,
    IProductImageStorageService productImageStorageService) : BaseCommandService<Product>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Product> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override Task<ServiceResult<IEntityResponse<Product>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Product> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateProductRequest request = (CreateProductRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return Task.FromResult<ServiceResult<IEntityResponse<Product>>?>(null);
        }

        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var exists = context.Products.GetByTenant(tenantId.Value)
            .Any(x => x.Sku.ToUpper() == normalizedSku);

        if (exists)
        {
            var conflict = ServiceResult<IEntityResponse<Product>>.Failure(StatusCodes.Status409Conflict, "A product with the same SKU already exists.");
            return Task.FromResult<ServiceResult<IEntityResponse<Product>>?>(conflict);
        }

        return Task.FromResult<ServiceResult<IEntityResponse<Product>>?>(null);
    }

    protected override async Task<ServiceResult<IEntityResponse<Product>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Product> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateProductRequest request = (UpdateProductRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var exists = await context.Products.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Sku.ToUpper() == normalizedSku, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<Product>>.Failure(StatusCodes.Status409Conflict, "A product with the same SKU already exists.");
        }

        return null;
    }

    public override async Task<Product> GetAddToDbObjectAsync(ICreateInput<Product> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        CreateProductRequest request = (CreateProductRequest)input;
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        created.Sku = request.Sku.Trim();
        created.Name = request.Name.Trim();
        created.Description = NormalizeOptional(request.Description);
        created.UnitOfMeasure = request.UnitOfMeasure.Trim().ToUpperInvariant();

        return created;
    }

    protected override async Task<Product> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Product> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        UpdateProductRequest request = (UpdateProductRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var product = await context.Products.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (product is null)
        {
            return null!;
        }

        // Validate SKU uniqueness before applying changes
        request.Adapt(product);
        product.Sku = request.Sku.Trim();
        product.Name = request.Name.Trim();
        product.Description = NormalizeOptional(request.Description);
        product.UnitOfMeasure = request.UnitOfMeasure.Trim().ToUpperInvariant();

        return product;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    protected override async Task<Product> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        
        if (!tenantId.HasValue)
        {
            return default!;
        }

        var product = await context.Products.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return product ?? default!;
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(
        Guid id,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return await base.DeleteAsync(id, dbContext, cancellationToken);

        var media = await dbContext.Products.GetByTenant(tenantId.Value)
            .Where(x => x.Id == id)
            .Select(x => new { x.ImageUrl, x.ThumbnailUrl })
            .FirstOrDefaultAsync(cancellationToken);

        if (media is null)
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Product not found.");

        try
        {
            await productImageStorageService.DeleteAsync(media.ImageUrl, media.ThumbnailUrl, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status502BadGateway,
                "The product could not be deleted because its stored images could not be removed. Please try again.");
        }

        return await base.DeleteAsync(id, dbContext, cancellationToken);
    }

    protected override string GetNotFoundMessage() => "Product not found.";
}
