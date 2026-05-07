using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/warehouses")]
[Authorize]
public class WarehousesController(
    IMediator mediator,
    ITenantMemoryCache tenantMemoryCache) : ServiceResultControllerBase
{
    private const string CacheArea = "warehouses";

    [HttpGet]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<IReadOnlyCollection<WarehouseListItemResponse>>> GetAll()
    {
        if (tenantMemoryCache.TryGetValue<IReadOnlyCollection<WarehouseListItemResponse>>(CacheArea, "all", out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetWarehousesQuery(), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, "all", result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpGet("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.View)]
    public async Task<ActionResult<WarehouseDetailsResponse>> GetById(Guid warehouseId)
    {
        var detailsKey = $"details:{warehouseId}";
        if (tenantMemoryCache.TryGetValue<WarehouseDetailsResponse>(CacheArea, detailsKey, out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetWarehouseByIdQuery(warehouseId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, detailsKey, result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Create([FromBody] CreateWarehouseRequest request)
    {
        var result = await mediator.Send(new CreateWarehouseCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");

        return CreatedAtAction(nameof(GetById), new { warehouseId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult<WarehouseDetailsResponse>> Update(Guid warehouseId, [FromBody] UpdateWarehouseRequest request)
    {
        var result = await mediator.Send(new UpdateWarehouseCommand(warehouseId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{warehouseId}");
        return Ok(result.Value);
    }

    [HttpDelete("{warehouseId:guid}")]
    [Authorize(Policy = AppPermissions.Inventory.Manage)]
    public async Task<ActionResult> Delete(Guid warehouseId)
    {
        var result = await mediator.Send(new DeleteWarehouseCommand(warehouseId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "all");
        tenantMemoryCache.Remove(CacheArea, $"details:{warehouseId}");
        return NoContent();
    }
}
