using Mapster;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class ProductCommandService : BaseCommandService<Product>
{
    private readonly AppDbContext dbContext;

    public ProductCommandService(
        AppDbContext dbContext,
        ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
        this.dbContext = dbContext;
    }

    protected override bool ValidateAddInput(ICreateInput<Product> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateProductRequest request = (CreateProductRequest)input;
        var tenantId = TryGetTenantId();

        if (tenantId.HasValue)
        {
            var normalizedSku = request.Sku.Trim().ToUpperInvariant();
            if (dbContext.Products.GetByTenant(tenantId.Value).Any(x => x.Sku.ToUpper() == normalizedSku))
            {
                errorMessage = "A product with the same SKU already exists.";
                return false;
            }
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
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
        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var skuConflict = await context.Products.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Sku.ToUpper() == normalizedSku, cancellationToken);
        if (skuConflict)
        {
            return null!;
        }

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

    protected override string GetNotFoundMessage() => "Product not found.";
}
