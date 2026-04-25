using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts.Inventory.Warehouses;
using VexorionERP.Database;
using VexorionERP.Database.Abstractions;
using VexorionERP.Models.Inventory;
using VexorionERP.Services.Results;

namespace VexorionERP.Services;

public class WarehouseCommandService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider) : IWarehouseCommandService
{
    public async Task<ServiceResult<WarehouseDetailsResponse>> CreateAsync(CreateWarehouseRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Code, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<WarehouseDetailsResponse>.ValidationFailure(validation);
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Warehouses.AnyAsync(
            x => x.TenantId == currentTenantProvider.TenantId.Value && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A warehouse with the same code already exists.");
        }

        var warehouse = request.Adapt<Warehouse>();
        warehouse.TenantId = currentTenantProvider.TenantId.Value;
        Normalize(warehouse);

        dbContext.Warehouses.Add(warehouse);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<WarehouseDetailsResponse>.Success(warehouse.Adapt<WarehouseDetailsResponse>());
    }

    public async Task<ServiceResult<WarehouseDetailsResponse>> UpdateAsync(Guid warehouseId, UpdateWarehouseRequest request, CancellationToken cancellationToken = default)
    {
        if (!currentTenantProvider.TenantId.HasValue)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = Validate(request.Code, request.Name);
        if (validation.Count > 0)
        {
            return ServiceResult<WarehouseDetailsResponse>.ValidationFailure(validation);
        }

        var warehouse = await dbContext.Warehouses.FirstOrDefaultAsync(x => x.Id == warehouseId, cancellationToken);
        if (warehouse is null)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Warehouse not found.");
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await dbContext.Warehouses.AnyAsync(
            x => x.Id != warehouseId && x.TenantId == currentTenantProvider.TenantId.Value && x.Code.ToUpper() == normalizedCode,
            cancellationToken);

        if (codeExists)
        {
            return ServiceResult<WarehouseDetailsResponse>.Failure(StatusCodes.Status409Conflict, "A warehouse with the same code already exists.");
        }

        request.Adapt(warehouse);
        Normalize(warehouse);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<WarehouseDetailsResponse>.Success(warehouse.Adapt<WarehouseDetailsResponse>());
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        var warehouse = await dbContext.Warehouses.FirstOrDefaultAsync(x => x.Id == warehouseId, cancellationToken);
        if (warehouse is null)
        {
            return ServiceResult<bool>.Failure(StatusCodes.Status404NotFound, "Warehouse not found.");
        }

        dbContext.Warehouses.Remove(warehouse);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ServiceResult<bool>.Success(true);
    }

    private static Dictionary<string, string[]> Validate(string code, string name)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(code))
        {
            errors[nameof(CreateWarehouseRequest.Code)] = ["Code is required."];
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            errors[nameof(CreateWarehouseRequest.Name)] = ["Name is required."];
        }

        return errors;
    }

    private static void Normalize(Warehouse warehouse)
    {
        warehouse.Code = warehouse.Code.Trim().ToUpperInvariant();
        warehouse.Name = warehouse.Name.Trim();
        warehouse.LocationDescription = string.IsNullOrWhiteSpace(warehouse.LocationDescription) ? null : warehouse.LocationDescription.Trim();
    }
}