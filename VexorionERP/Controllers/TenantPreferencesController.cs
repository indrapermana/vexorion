using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/configuration/preferences")]
[Authorize]
public class TenantPreferencesController(
    IMediator mediator,
    ITenantMemoryCache tenantMemoryCache) : ServiceResultControllerBase
{
    private const string CacheArea = "tenant-preferences";

    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<TenantPreferencesResponse>> Get()
    {
        if (tenantMemoryCache.TryGetValue<TenantPreferencesResponse>(CacheArea, "current", out var cached) && cached is not null)
        {
            return Ok(cached);
        }

        var result = await mediator.Send(new GetTenantPreferencesQuery(), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Set(CacheArea, "current", result.Value!, TimeSpan.FromMinutes(5));
        return Ok(result.Value);
    }

    [HttpPut("menu")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateMenu([FromBody] UpdateMenuConfigurationRequest request)
    {
        var result = await mediator.Send(new UpdateTenantMenuConfigurationCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "current");
        return Ok(result.Value);
    }

    [HttpPut("discount")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateDiscount([FromBody] UpdateDiscountConfigurationRequest request)
    {
        var result = await mediator.Send(new UpdateTenantDiscountConfigurationCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        tenantMemoryCache.Remove(CacheArea, "current");
        return Ok(result.Value);
    }
}
