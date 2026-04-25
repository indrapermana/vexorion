using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Balances;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Inventory;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class InventoryBalanceCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IInventoryBalanceCommandService
{
    public async Task<ServiceResult<InventoryBalanceDetailsResponse>> CreateAsync(CreateInventoryBalanceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.ProductId, request.WarehouseId, request.QuantityOnHand, request.QuantityReserved);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.ValidationFailure(validation);
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var exists = await dbContext.InventoryBalances.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.ProductId == request.ProductId && x.WarehouseId == request.WarehouseId,
            cancellationToken);

        if (exists)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An inventory balance already exists for this product and warehouse.");
        }

        var balance = request.Adapt<InventoryBalance>();
        balance.TenantId = currentTenantProvider.TenantId.Value;

        dbContext.InventoryBalances.Add(balance);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryBalanceDetailsResponse>.Success(balance.Adapt<InventoryBalanceDetailsResponse>());
    }

    public async Task<ServiceResult<InventoryBalanceDetailsResponse>> UpdateAsync(Guid inventoryBalanceId, UpdateInventoryBalanceRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.ProductId, request.WarehouseId, request.QuantityOnHand, request.QuantityReserved);
        if (validation.Count > 0)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.ValidationFailure(validation);
        }

        var balance = await dbContext.InventoryBalances.FirstOrDefaultAsync(x => x.Id == inventoryBalanceId, cancellationToken);
        if (balance is null)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Inventory balance not found.");
        }

        if (!await dbContext.Products.AnyAsync(x => x.Id == request.ProductId, cancellationToken))
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Product not found.");
        }

        if (!await dbContext.Warehouses.AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.");
        }

        var exists = await dbContext.InventoryBalances.AnyAsync(
            x => x.Id != inventoryBalanceId && x.TenantId == currentTenantProvider.TenantId.Value && x.ProductId == request.ProductId && x.WarehouseId == request.WarehouseId,
            cancellationToken);

        if (exists)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.Failure(StatusCodes.Status409Conflict, "An inventory balance already exists for this product and warehouse.");
        }

        request.Adapt(balance);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<InventoryBalanceDetailsResponse>.Success(balance.Adapt<InventoryBalanceDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid inventoryBalanceId, CancellationToken cancellationToken = default)
    {
        var balance = await dbContext.InventoryBalances.FirstOrDefaultAsync(x => x.Id == inventoryBalanceId, cancellationToken);
        if (balance is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Inventory balance not found.");
        }

        dbContext.InventoryBalances.Remove(balance);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

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