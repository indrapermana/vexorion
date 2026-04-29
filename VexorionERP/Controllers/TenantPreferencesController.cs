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
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<TenantPreferencesResponse>> Get()
    {
        var result = await mediator.Send(new GetTenantPreferencesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("menu")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateMenu([FromBody] UpdateMenuConfigurationRequest request)
    {
        var result = await mediator.Send(new UpdateTenantMenuConfigurationCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("discount")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateDiscount([FromBody] UpdateDiscountConfigurationRequest request)
    {
        var result = await mediator.Send(new UpdateTenantDiscountConfigurationCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
