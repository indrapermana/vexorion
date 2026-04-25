using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Inventory.Adjustments;
using VexorionERP.Models.Identity;
using VexorionERP.Services;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/inventory-adjustments")]
[Authorize]
public class InventoryAdjustmentsController(
    IInventoryAdjustmentCommandService inventoryAdjustmentCommandService,
    IInventoryAdjustmentQueryService inventoryAdjustmentQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<InventoryAdjustmentListItemResponse>>> GetAll()
    {
        var result = await inventoryAdjustmentQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> GetById(Guid inventoryAdjustmentId)
    {
        var result = await inventoryAdjustmentQueryService.GetByIdAsync(inventoryAdjustmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Create([FromBody] CreateInventoryAdjustmentRequest request)
    {
        var result = await inventoryAdjustmentCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { inventoryAdjustmentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<InventoryAdjustmentDetailsResponse>> Update(Guid inventoryAdjustmentId, [FromBody] UpdateInventoryAdjustmentRequest request)
    {
        var result = await inventoryAdjustmentCommandService.UpdateAsync(inventoryAdjustmentId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{inventoryAdjustmentId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid inventoryAdjustmentId)
    {
        var result = await inventoryAdjustmentCommandService.DeleteAsync(inventoryAdjustmentId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}