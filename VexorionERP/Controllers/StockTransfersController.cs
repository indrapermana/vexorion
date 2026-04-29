using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/stock-transfers")]
[Authorize]
public class StockTransfersController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<StockTransferListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetStockTransfersQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<StockTransferDetailsResponse>> GetById(Guid stockTransferId)
    {
        var result = await mediator.Send(new GetStockTransferByIdQuery(stockTransferId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferDetailsResponse>> Create([FromBody] CreateStockTransferRequest request)
    {
        var result = await mediator.Send(new CreateStockTransferCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetById), new { stockTransferId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferDetailsResponse>> Update(Guid stockTransferId, [FromBody] UpdateStockTransferRequest request)
    {
        var result = await mediator.Send(new UpdateStockTransferCommand(stockTransferId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockTransferId)
    {
        var result = await mediator.Send(new DeleteStockTransferCommand(stockTransferId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
