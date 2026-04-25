using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Balances;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/inventory-balances")]
[Authorize]
public class InventoryBalancesController(
    IInventoryBalanceCommandService inventoryBalanceCommandService,
    IInventoryBalanceQueryService inventoryBalanceQueryService) : ServiceResultControllerBase
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
        var result = await inventoryBalanceCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { inventoryBalanceId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryBalanceDetailsResponse>> Update(Guid inventoryBalanceId, [FromBody] UpdateInventoryBalanceRequest request)
    {
        var result = await inventoryBalanceCommandService.UpdateAsync(inventoryBalanceId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryBalanceId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryBalanceId)
    {
        var result = await inventoryBalanceCommandService.DeleteAsync(inventoryBalanceId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}