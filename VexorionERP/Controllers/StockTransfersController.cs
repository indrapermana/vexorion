using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-transfers")]
[Authorize]
public class StockTransfersController(
    ICommandService<StockTransfer> stockTransferCommandService,
    IStockTransferQueryService stockTransferQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
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
        var result = await stockTransferCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<StockTransferDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { stockTransferId = mapped.Id }, mapped);
    }

    [HttpPut("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockTransferDetailsResponse>> Update(Guid stockTransferId, [FromBody] UpdateStockTransferRequest request)
    {
        var result = await stockTransferCommandService.UpdateAsync(stockTransferId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{stockTransferId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockTransferId)
    {
        var result = await stockTransferCommandService.DeleteAsync(stockTransferId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<StockTransferDetailsResponse> MapResult(ServiceResult<IEntityResponse<StockTransfer>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<StockTransferDetailsResponse>();
            return ServiceResult<StockTransferDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<StockTransferDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<StockTransferDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
