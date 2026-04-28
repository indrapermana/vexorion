using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-transfers/{stockTransferId:guid}/lines")]
[Authorize]
public class StockTransferLinesController(IStockTransferLineCommandService stockTransferLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferLineDetailsResponse>> Create(Guid stockTransferId, [FromBody] CreateStockTransferLineRequest request)
    {
        var result = await stockTransferLineCommandService.CreateAsync(stockTransferId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{stockTransferLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferLineDetailsResponse>> Update(Guid stockTransferId, Guid stockTransferLineId, [FromBody] UpdateStockTransferLineRequest request)
    {
        var result = await stockTransferLineCommandService.UpdateAsync(stockTransferId, stockTransferLineId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockTransferLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockTransferId, Guid stockTransferLineId)
    {
        var result = await stockTransferLineCommandService.DeleteAsync(stockTransferId, stockTransferLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
