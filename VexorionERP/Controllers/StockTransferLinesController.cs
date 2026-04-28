using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Mapster;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-transfers/{stockTransferId:guid}/lines")]
[Authorize]
public class StockTransferLinesController(
    ILineCommandService<StockTransfer, StockTransferLine> stockTransferLineCommandService) : ServiceResultControllerBase
{
    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferLineDetailsResponse>> Create(Guid stockTransferId, [FromBody] CreateStockTransferLineRequest request)
    {
        var result = await stockTransferLineCommandService.CreateAsync(stockTransferId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPut("{stockTransferLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferLineDetailsResponse>> Update(Guid stockTransferId, Guid stockTransferLineId, [FromBody] UpdateStockTransferLineRequest request)
    {
        var result = await stockTransferLineCommandService.UpdateAsync(stockTransferId, stockTransferLineId, request, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{stockTransferLineId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockTransferId, Guid stockTransferLineId)
    {
        var result = await stockTransferLineCommandService.DeleteAsync(stockTransferId, stockTransferLineId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<StockTransferLineDetailsResponse> MapResult<TResponse>(ServiceResult<TResponse> result)
        where TResponse : IEntityResponse<StockTransferLine>
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<StockTransferLineDetailsResponse>();
            return ServiceResult<StockTransferLineDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<StockTransferLineDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<StockTransferLineDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
