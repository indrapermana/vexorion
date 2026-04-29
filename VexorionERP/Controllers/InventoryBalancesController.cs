using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-balances")]
[Authorize]
public class InventoryBalancesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetInventoryBalancesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> GetById(Guid inventoryBalanceId)
    {
        var result = await mediator.Send(new GetInventoryBalanceByIdQuery(inventoryBalanceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> Create([FromBody] CreateInventoryBalanceRequest request)
    {
        var result = await mediator.Send(new CreateInventoryBalanceCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { inventoryBalanceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> Update(Guid inventoryBalanceId, [FromBody] UpdateInventoryBalanceRequest request)
    {
        var result = await mediator.Send(new UpdateInventoryBalanceCommand(inventoryBalanceId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryBalanceId)
    {
        var result = await mediator.Send(new DeleteInventoryBalanceCommand(inventoryBalanceId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
