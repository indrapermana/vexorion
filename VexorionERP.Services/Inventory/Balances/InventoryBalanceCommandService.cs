using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class InventoryBalanceCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<InventoryBalance>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<InventoryBalance> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateInventoryBalanceRequest request = (CreateInventoryBalanceRequest)input;
        var validation = Validate(request.ProductId, request.WarehouseId, request.QuantityOnHand, request.QuantityReserved);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<InventoryBalance>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<InventoryBalance> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateInventoryBalanceRequest request = (CreateInventoryBalanceRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Products.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var exists = await context.InventoryBalances.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.ProductId == request.ProductId && x.WarehouseId == request.WarehouseId, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status409Conflict, "An inventory balance already exists for this product and warehouse.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<InventoryBalance> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateInventoryBalanceRequest request = (UpdateInventoryBalanceRequest)input;
        var validation = Validate(request.ProductId, request.WarehouseId, request.QuantityOnHand, request.QuantityReserved);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<InventoryBalance>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<InventoryBalance> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateInventoryBalanceRequest request = (UpdateInventoryBalanceRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        if (!await context.Products.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (!await context.Warehouses.GetByTenant(tenantId.Value)
                .AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var exists = await context.InventoryBalances.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.ProductId == request.ProductId && x.WarehouseId == request.WarehouseId, cancellationToken);

        if (exists)
        {
            return ServiceResult<IEntityResponse<InventoryBalance>>.Failure(StatusCodes.Status409Conflict, "An inventory balance already exists for this product and warehouse.");
        }

        return null;
    }

    protected override async Task<InventoryBalance> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<InventoryBalance> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        UpdateInventoryBalanceRequest request = (UpdateInventoryBalanceRequest)input;
        var balance = await context.InventoryBalances.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (balance is null)
        {
            return null!;
        }

        request.Adapt(balance);
        return balance;
    }

    protected override async Task<InventoryBalance> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var balance = await context.InventoryBalances.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return balance ?? null!;
    }

    protected override string GetNotFoundMessage() => "Inventory balance not found.";

    private static Dictionary<string, string[]> Validate(Guid productId, Guid warehouseId, decimal quantityOnHand, decimal quantityReserved)
    {
        var errors = new Dictionary<string, string[]>();

        if (productId == Guid.Empty)
        {
            errors[nameof(CreateInventoryBalanceRequest.ProductId)] = ["Product is required."];
        }

        if (warehouseId == Guid.Empty)
        {
            errors[nameof(CreateInventoryBalanceRequest.WarehouseId)] = ["Warehouse is required."];
        }

        if (quantityOnHand < 0)
        {
            errors[nameof(CreateInventoryBalanceRequest.QuantityOnHand)] = ["Quantity on hand cannot be negative."];
        }

        if (quantityReserved < 0)
        {
            errors[nameof(CreateInventoryBalanceRequest.QuantityReserved)] = ["Quantity reserved cannot be negative."];
        }

        if (quantityReserved > quantityOnHand)
        {
            errors[nameof(CreateInventoryBalanceRequest.QuantityReserved)] = ["Quantity reserved cannot exceed quantity on hand."];
        }

        return errors;
    }
}
