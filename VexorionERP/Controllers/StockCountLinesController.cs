using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/stock-counts/{stockCountId:guid}/lines")]
[Authorize]
public class StockCountLinesController(IStockCountLineCommandService stockCountLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Create(Guid stockCountId, [FromBody] CreateStockCountLineRequest request)
    {
        var result = await stockCountLineCommandService.CreateAsync(stockCountId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Update(Guid stockCountId, Guid stockCountLineId, [FromBody] UpdateStockCountLineRequest request)
    {
        var result = await stockCountLineCommandService.UpdateAsync(stockCountId, stockCountLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId, Guid stockCountLineId)
    {
        var result = await stockCountLineCommandService.DeleteAsync(stockCountId, stockCountLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
