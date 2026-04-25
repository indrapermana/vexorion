using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Products;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Catalog;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class ProductCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IProductCommandService
{
    public async Task<ServiceResult<ProductDetailsResponse>> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Sku, request.Name, request.UnitOfMeasure);
        if (validation.Count > 0)
        {
            return ServiceResult<ProductDetailsResponse>.ValidationFailure(validation);
        }

        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var skuExists = await dbContext.Products.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.Sku.ToUpper() == normalizedSku,
            cancellationToken);

        if (skuExists)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A product with the same SKU already exists.");
        }

        var product = request.Adapt<Product>();
        product.TenantId = currentTenantProvider.TenantId.Value;
        product.Sku = request.Sku.Trim();
        product.Name = request.Name.Trim();
        product.Description = NormalizeOptional(request.Description);
        product.UnitOfMeasure = request.UnitOfMeasure.Trim().ToUpperInvariant();

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<ProductDetailsResponse>.Success(product.Adapt<ProductDetailsResponse>());
    }

    public async Task<ServiceResult<ProductDetailsResponse>> UpdateAsync(Guid productId, UpdateProductRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Sku, request.Name, request.UnitOfMeasure);
        if (validation.Count > 0)
        {
            return ServiceResult<ProductDetailsResponse>.ValidationFailure(validation);
        }

        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);
        if (product is null)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Product not found.");
        }

        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var skuExists = await dbContext.Products.AnyAsync(
            x => x.Id != productId && x.TenantId == currentTenantProvider.TenantId.Value && x.Sku.ToUpper() == normalizedSku,
            cancellationToken);

        if (skuExists)
        {
            return ServiceResult<ProductDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A product with the same SKU already exists.");
        }

        request.Adapt(product);
        product.Sku = request.Sku.Trim();
        product.Name = request.Name.Trim();
        product.Description = NormalizeOptional(request.Description);
        product.UnitOfMeasure = request.UnitOfMeasure.Trim().ToUpperInvariant();

        await dbContext.SaveChangesAsync(cancellationToken);

        return ServiceResult<ProductDetailsResponse>.Success(product.Adapt<ProductDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid productId, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);
        if (product is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Product not found.");
        }

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string sku, string name, string unitOfMeasure)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(sku))
        {
            errors[nameof(CreateProductRequest.Sku)] = ["SKU is required."];
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateProductRequest.Name)] = ["Name is required."];
        }

        if (string.IsNullOrWhiteSpace(unitOfMeasure))
        {
            errors[nameof(CreateProductRequest.UnitOfMeasure)] = ["Unit of measure is required."];
        }

        return errors;
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}