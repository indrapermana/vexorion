using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/inventory-adjustments/{inventoryAdjustmentId:guid}/lines")]
[Authorize]
public class InventoryAdjustmentLinesController(IInventoryAdjustmentLineCommandService inventoryAdjustmentLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Create(Guid inventoryAdjustmentId, [FromBody] CreateInventoryAdjustmentLineRequest request)
    {
        var result = await inventoryAdjustmentLineCommandService.CreateAsync(inventoryAdjustmentId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Update(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, [FromBody] UpdateInventoryAdjustmentLineRequest request)
    {
        var result = await inventoryAdjustmentLineCommandService.UpdateAsync(inventoryAdjustmentId, inventoryAdjustmentLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId)
    {
        var result = await inventoryAdjustmentLineCommandService.DeleteAsync(inventoryAdjustmentId, inventoryAdjustmentLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}