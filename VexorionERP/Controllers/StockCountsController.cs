using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/stock-counts")]
[Authorize]
public class StockCountsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetStockCountsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<StockCountDetailsResponse>> GetById(Guid stockCountId)
    {
        var result = await mediator.Send(new GetStockCountByIdQuery(stockCountId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Create([FromBody] CreateStockCountRequest request)
    {
        var result = await mediator.Send(new CreateStockCountCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(result);
        return CreatedAtAction(nameof(GetById), new { stockCountId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Update(Guid stockCountId, [FromBody] UpdateStockCountRequest request)
    {
        var result = await mediator.Send(new UpdateStockCountCommand(stockCountId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId)
    {
        var result = await mediator.Send(new DeleteStockCountCommand(stockCountId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
