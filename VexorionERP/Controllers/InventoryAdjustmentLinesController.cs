using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-adjustments/{inventoryAdjustmentId:guid}/lines")]
[Authorize]
public class InventoryAdjustmentLinesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Create(Guid inventoryAdjustmentId, [FromBody] CreateInventoryAdjustmentLineRequest request)
    {
        var result = await mediator.Send(new CreateInventoryAdjustmentLineCommand(inventoryAdjustmentId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentLineDetailsResponse>> Update(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId, [FromBody] UpdateInventoryAdjustmentLineRequest request)
    {
        var result = await mediator.Send(new UpdateInventoryAdjustmentLineCommand(inventoryAdjustmentId, inventoryAdjustmentLineId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryAdjustmentLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId, Guid inventoryAdjustmentLineId)
    {
        var result = await mediator.Send(new DeleteInventoryAdjustmentLineCommand(inventoryAdjustmentId, inventoryAdjustmentLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
