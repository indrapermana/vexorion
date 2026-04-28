using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/warehouses")]
[Authorize]
public class WarehousesController(
    ICommandService<Warehouse> warehouseCommandService,
    IQueryService<Warehouse> warehouseQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseListItemResponse>>> GetAll()
    {
        var result = await warehouseQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<WarehouseDetailsResponse>> GetById(Guid warehouseId)
    {
        var result = await warehouseQueryService.GetByIdAsync(warehouseId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Create([FromBody] CreateWarehouseRequest request)
    {
        var result = await warehouseCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<WarehouseDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { warehouseId = mapped.Id }, mapped);
    }

    [HttpPut("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Update(Guid warehouseId, [FromBody] UpdateWarehouseRequest request)
    {
        var result = await warehouseCommandService.UpdateAsync(warehouseId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid warehouseId)
    {
        var result = await warehouseCommandService.DeleteAsync(warehouseId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<WarehouseDetailsResponse> MapResult(ServiceResult<IEntityResponse<Warehouse>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<WarehouseDetailsResponse>();
            return ServiceResult<WarehouseDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<WarehouseDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<WarehouseDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }

    private ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<Warehouse>>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<IReadOnlyCollection<WarehouseListItemResponse>>();
            return ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<IReadOnlyCollection<WarehouseListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
