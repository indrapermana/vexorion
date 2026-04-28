using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Services;

public class WarehouseCommandService(
    ICurrentTenantProvider currentTenantProvider) : BaseCommandService<Warehouse>(currentTenantProvider)
{
    protected override bool ValidateAddInput(ICreateInput<Warehouse> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        CreateWarehouseRequest request = (CreateWarehouseRequest)input;
        var validation = Validate(request.Code, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateAddInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Warehouse>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<Warehouse> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        CreateWarehouseRequest request = (CreateWarehouseRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Code.ToUpper() == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<Warehouse>>.Failure(StatusCodes.Status409Conflict, "A warehouse with the same code already exists.");
        }

        return null;
    }

    protected override bool ValidateUpdateInput(IUpdateInput<Warehouse> input, out IDictionary<string, string[]>? errors, out string? errorMessage)
    {
        errors = null;
        errorMessage = null;

        UpdateWarehouseRequest request = (UpdateWarehouseRequest)input;
        var validation = Validate(request.Code, request.Name);
        if (validation.Count > 0)
        {
            errors = validation;
            return false;
        }

        return base.ValidateUpdateInput(input, out errors, out errorMessage);
    }

    protected override async Task<ServiceResult<IEntityResponse<Warehouse>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<Warehouse> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        UpdateWarehouseRequest request = (UpdateWarehouseRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null;
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var codeExists = await context.Warehouses.GetByTenant(tenantId.Value)
            .AnyAsync(x => x.Id != id && x.Code.ToUpper() == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ServiceResult<IEntityResponse<Warehouse>>.Failure(StatusCodes.Status409Conflict, "A warehouse with the same code already exists.");
        }

        return null;
    }

    public override async Task<Warehouse> GetAddToDbObjectAsync(ICreateInput<Warehouse> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var created = await base.GetAddToDbObjectAsync(input, context, cancellationToken);
        Normalize(created);
        return created;
    }

    protected override async Task<Warehouse> GetUpdatedDbObjectAsync(Guid id, IUpdateInput<Warehouse> input, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        UpdateWarehouseRequest request = (UpdateWarehouseRequest)input;
        var warehouse = await context.Warehouses.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (warehouse is null)
        {
            return null!;
        }

        request.Adapt(warehouse);
        Normalize(warehouse);

        return warehouse;
    }

    protected override async Task<Warehouse> GetDeleteObjectAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
        {
            return null!;
        }

        var warehouse = await context.Warehouses.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return warehouse ?? null!;
    }

    protected override string GetNotFoundMessage() => "Warehouse not found.";

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
