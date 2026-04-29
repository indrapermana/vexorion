using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-adjustments")]
[Authorize]
public class InventoryAdjustmentsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetInventoryAdjustmentsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> GetById(Guid inventoryAdjustmentId)
    {
        var result = await mediator.Send(new GetInventoryAdjustmentByIdQuery(inventoryAdjustmentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Create([FromBody] CreateInventoryAdjustmentRequest request)
    {
        var result = await mediator.Send(new CreateInventoryAdjustmentCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { inventoryAdjustmentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Update(Guid inventoryAdjustmentId, [FromBody] UpdateInventoryAdjustmentRequest request)
    {
        var result = await mediator.Send(new UpdateInventoryAdjustmentCommand(inventoryAdjustmentId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId)
    {
        var result = await mediator.Send(new DeleteInventoryAdjustmentCommand(inventoryAdjustmentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
