using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/stock-counts")]
[Authorize]
public class StockCountsController(
    ICommandService<StockCount> stockCountCommandService,
    IQueryService<StockCount> stockCountQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<StockCountListItemResponse>>> GetAll()
    {
        var result = await stockCountQueryService.GetAllAsync(dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpGet("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<StockCountDetailsResponse>> GetById(Guid stockCountId)
    {
        var result = await stockCountQueryService.GetByIdAsync(stockCountId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Create([FromBody] CreateStockCountRequest request)
    {
        var result = await stockCountCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded) return ToActionResult(MapResult(result));
        var mapped = result.Value!.Adapt<StockCountDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { stockCountId = mapped.Id }, mapped);
    }

    [HttpPut("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<StockCountDetailsResponse>> Update(Guid stockCountId, [FromBody] UpdateStockCountRequest request)
    {
        var result = await stockCountCommandService.UpdateAsync(stockCountId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{stockCountId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid stockCountId)
    {
        var result = await stockCountCommandService.DeleteAsync(stockCountId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<StockCountDetailsResponse> MapResult(ServiceResult<IEntityResponse<StockCount>> result)
    {
        if (result.Succeeded)
            return ServiceResult<StockCountDetailsResponse>.Success(result.Value!.Adapt<StockCountDetailsResponse>());
        if (result.Validation is not null)
            return ServiceResult<StockCountDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<StockCountDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }

    private ServiceResult<IReadOnlyCollection<StockCountListItemResponse>> MapResult(ServiceResult<IReadOnlyCollection<IEntityListResponse<StockCount>>> result)
    {
        if (result.Succeeded)
            return ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>.Success(result.Value!.Adapt<IReadOnlyCollection<StockCountListItemResponse>>());
        if (result.Validation is not null)
            return ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        return ServiceResult<IReadOnlyCollection<StockCountListItemResponse>>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? "An error occurred.");
    }
}
