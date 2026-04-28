using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-transfers")]
[Authorize]
public class StockTransfersController(
    IStockTransferCommandService stockTransferCommandService,
    IStockTransferQueryService stockTransferQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<StockTransferListItemResponse>>> GetAll()
    {
        var result = await stockTransferQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<StockTransferDetailsResponse>> GetById(Guid stockTransferId)
    {
        var result = await stockTransferQueryService.GetByIdAsync(stockTransferId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferDetailsResponse>> Create([FromBody] CreateStockTransferRequest request)
    {
        var result = await stockTransferCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { stockTransferId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferDetailsResponse>> Update(Guid stockTransferId, [FromBody] UpdateStockTransferRequest request)
    {
        var result = await stockTransferCommandService.UpdateAsync(stockTransferId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockTransferId)
    {
        var result = await stockTransferCommandService.DeleteAsync(stockTransferId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
