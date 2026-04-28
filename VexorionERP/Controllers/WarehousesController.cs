using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/warehouses")]
[Authorize]
public class WarehousesController(
    IWarehouseCommandService warehouseCommandService,
    IWarehouseQueryService warehouseQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseListItemResponse>>> GetAll()
    {
        var result = await warehouseQueryService.GetAllAsync(HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<WarehouseDetailsResponse>> GetById(Guid warehouseId)
    {
        var result = await warehouseQueryService.GetByIdAsync(warehouseId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Create([FromBody] CreateWarehouseRequest request)
    {
        var result = await warehouseCommandService.CreateAsync(request, HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { warehouseId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Update(Guid warehouseId, [FromBody] UpdateWarehouseRequest request)
    {
        var result = await warehouseCommandService.UpdateAsync(warehouseId, request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid warehouseId)
    {
        var result = await warehouseCommandService.DeleteAsync(warehouseId, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
