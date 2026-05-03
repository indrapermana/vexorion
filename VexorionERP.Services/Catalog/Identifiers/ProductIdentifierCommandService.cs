using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProductIdentifierCommandService : BaseCommandService<ProductIdentifier>
{
    public ProductIdentifierCommandService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    protected override async Task<ServiceResult<IEntityResponse<ProductIdentifier>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<ProductIdentifier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProductIdentifierRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalized = request.CodeValue.Trim().ToUpperInvariant();
        var exists = await context.ProductIdentifiers
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.NormalizedCodeValue == normalized, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<ProductIdentifier>>.Failure(
                StatusCodes.Status409Conflict,
                "A product identifier with the same code value already exists.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<ProductIdentifier>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<ProductIdentifier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProductIdentifierRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalized = request.CodeValue.Trim().ToUpperInvariant();
        var exists = await context.ProductIdentifiers
            .GetByTenant(tenantId.Value)
            .AnyAsync(x => x.NormalizedCodeValue == normalized && x.Id != id, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<ProductIdentifier>>.Failure(
                StatusCodes.Status409Conflict,
                "A product identifier with the same code value already exists.");
        }

        return null;
    }

    public override Task<ProductIdentifier> GetAddToDbObjectAsync(
        ICreateInput<ProductIdentifier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateProductIdentifierRequest)input;
        var entity = new ProductIdentifier
        {
            ProductId = request.ProductId,
            CodeType = request.CodeType,
            CodeValue = request.CodeValue.Trim(),
            NormalizedCodeValue = request.CodeValue.Trim().ToUpperInvariant(),
            IsPrimary = request.IsPrimary
        };
        return Task.FromResult(entity);
    }

    protected override async Task<ProductIdentifier> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<ProductIdentifier> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProductIdentifierRequest)input;
        var entity = await context.ProductIdentifiers.GetByTenant(TenantId).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null!;
        }

        entity.CodeType = request.CodeType;
        entity.CodeValue = request.CodeValue.Trim();
        entity.NormalizedCodeValue = request.CodeValue.Trim().ToUpperInvariant();
        entity.IsPrimary = request.IsPrimary;
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<ProductIdentifier> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.ProductIdentifiers.GetByTenant(TenantId).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity!;
    }
}
