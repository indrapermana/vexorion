using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Mapster;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-adjustments/{inventoryAdjustmentId:guid}/lines")]
[Authorize]
public class InventoryAdjustmentLinesController(
    ILineCommandService<InventoryAdjustment, InventoryAdjustmentLine> inventoryAdjustmentLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Create(Guid inventoryAdjustmentId, [FromBody] CreateInventoryAdjustmentLineRequest request)
    {
        var result = await inventoryAdjustmentLineCommandService.CreateAsync(inventoryAdjustmentId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPut("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Update(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, [FromBody] UpdateInventoryAdjustmentLineRequest request)
    {
        var result = await inventoryAdjustmentLineCommandService.UpdateAsync(inventoryAdjustmentId, inventoryAdjustmentLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId)
    {
        var result = await inventoryAdjustmentLineCommandService.DeleteAsync(inventoryAdjustmentId, inventoryAdjustmentLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<InventoryAdjustmentLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<InventoryAdjustmentLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<InventoryAdjustmentLineDetailsResponse>();
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<InventoryAdjustmentLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<InventoryAdjustmentLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
