using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-adjustments")]
[Authorize]
public class InventoryAdjustmentsController(
    ICommandService<InventoryAdjustment> inventoryAdjustmentCommandService,
    IInventoryAdjustmentQueryService inventoryAdjustmentQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAll()
    {
        var result = await inventoryAdjustmentQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> GetById(Guid inventoryAdjustmentId)
    {
        var result = await inventoryAdjustmentQueryService.GetByIdAsync(inventoryAdjustmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Create([FromBody] CreateInventoryAdjustmentRequest request)
    {
        var result = await inventoryAdjustmentCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<InventoryAdjustmentDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { inventoryAdjustmentId = mapped.Id }, mapped);
    }

    [HttpPut("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Update(Guid inventoryAdjustmentId, [FromBody] UpdateInventoryAdjustmentRequest request)
    {
        var result = await inventoryAdjustmentCommandService.UpdateAsync(inventoryAdjustmentId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId)
    {
        var result = await inventoryAdjustmentCommandService.DeleteAsync(inventoryAdjustmentId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<InventoryAdjustmentDetailsResponse> MapResult(ServiceResult<IEntityResponse<InventoryAdjustment>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<InventoryAdjustmentDetailsResponse>();
            return ServiceResult<InventoryAdjustmentDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<InventoryAdjustmentDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<InventoryAdjustmentDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
