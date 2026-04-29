using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/stock-counts/{stockCountId:guid}/lines")]
[Authorize]
public class StockCountLinesController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Create(Guid stockCountId, [FromBody] CreateStockCountLineRequest request)
    {
        var result = await mediator.Send(new CreateStockCountLineCommand(stockCountId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Update(Guid stockCountId, Guid stockCountLineId, [FromBody] UpdateStockCountLineRequest request)
    {
        var result = await mediator.Send(new UpdateStockCountLineCommand(stockCountId, stockCountLineId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId, Guid stockCountLineId)
    {
        var result = await mediator.Send(new DeleteStockCountLineCommand(stockCountId, stockCountLineId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
