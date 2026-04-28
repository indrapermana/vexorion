using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/inventory-balances")]
[Authorize]
public class InventoryBalancesController(
    ICommandService<InventoryBalance> inventoryBalanceCommandService,
    IInventoryBalanceQueryService inventoryBalanceQueryService,
    AppDbContext dbContext) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryBalanceListItemResponse>>> GetAll()
    {
        var result = await inventoryBalanceQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> GetById(Guid inventoryBalanceId)
    {
        var result = await inventoryBalanceQueryService.GetByIdAsync(inventoryBalanceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> Create([FromBody] CreateInventoryBalanceRequest request)
    {
        var result = await inventoryBalanceCommandService.CreateAsync(request, dbContext, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(MapResult(result));
        }

        var mapped = result.Value!.Adapt<InventoryBalanceDetailsResponse>();
        return CreatedAtAction(nameof(GetById), new { inventoryBalanceId = mapped.Id }, mapped);
    }

    [HttpPut("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> Update(Guid inventoryBalanceId, [FromBody] UpdateInventoryBalanceRequest request)
    {
        var result = await inventoryBalanceCommandService.UpdateAsync(inventoryBalanceId, request, dbContext, HttpContext.RequestAborted);
        return ToActionResult(MapResult(result));
    }

    [HttpDelete("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryBalanceId)
    {
        var result = await inventoryBalanceCommandService.DeleteAsync(inventoryBalanceId, dbContext, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ServiceResult<InventoryBalanceDetailsResponse> MapResult(ServiceResult<IEntityResponse<InventoryBalance>> result)
    {
        if (result.Succeeded)
        {
            var mapped = result.Value!.Adapt<InventoryBalanceDetailsResponse>();
            return ServiceResult<InventoryBalanceDetailsResponse>.Success(mapped);
        }

        if (result.Validation is not null)
        {
            return ServiceResult<InventoryBalanceDetailsResponse>.ValidationFailure(result.Validation.Errors.ToDictionary(kvp => kvp.Key, kvp => kvp.Value));
        }

        return ServiceResult<InventoryBalanceDetailsResponse>.Failure(
            result.StatusCode ?? StatusCodes.Status400BadRequest,
            result.ErrorMessage ?? Errors.ERR_UNKNOWN_ERROR);
    }
}
