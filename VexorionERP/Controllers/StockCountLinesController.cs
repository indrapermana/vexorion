using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Mapster;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-counts/{stockCountId:guid}/lines")]
[Authorize]
public class StockCountLinesController(
    ILineCommandService<StockCount, StockCountLine> stockCountLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Create(Guid stockCountId, [FromBody] CreateStockCountLineRequest request)
    {
        var result = await stockCountLineCommandService.CreateAsync(stockCountId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPut("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountLineDetailsResponse>> Update(Guid stockCountId, Guid stockCountLineId, [FromBody] UpdateStockCountLineRequest request)
    {
        var result = await stockCountLineCommandService.UpdateAsync(stockCountId, stockCountLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{stockCountLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId, Guid stockCountLineId)
    {
        var result = await stockCountLineCommandService.DeleteAsync(stockCountId, stockCountLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<StockCountLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<StockCountLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<StockCountLineDetailsResponse>();
            return ServiceResult<StockCountLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<StockCountLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<StockCountLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
