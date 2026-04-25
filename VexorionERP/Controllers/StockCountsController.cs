using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Counts;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/stock-counts")]
[Authorize]
public class StockCountsController(
    IStockCountCommandService stockCountCommandService,
    IStockCountQueryService stockCountQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAll()
    {
        var result = await stockCountQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<StockCountDetailsResponse>> GetById(Guid stockCountId)
    {
        var result = await stockCountQueryService.GetByIdAsync(stockCountId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Create([FromBody] CreateStockCountRequest request)
    {
        var result = await stockCountCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { stockCountId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Update(Guid stockCountId, [FromBody] UpdateStockCountRequest request)
    {
        var result = await stockCountCommandService.UpdateAsync(stockCountId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId)
    {
        var result = await stockCountCommandService.DeleteAsync(stockCountId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
