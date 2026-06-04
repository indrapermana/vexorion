using System.Security.Claims;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tenants/{tenantId:guid}/modules")]
[Authorize]
public class TenantModuleConfigController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.TenantModules.View)]
    public async Task<ActionResult<TenantModuleConfigResponse>> Get(Guid tenantId)
    {
        var result = await mediator.Send(new GetTenantModuleConfigQuery(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut]
    [Authorize(Policy = AppPermissions.TenantModules.Manage)]
    public async Task<ActionResult<TenantModuleConfigResponse>> Update(Guid tenantId, [FromBody] UpdateTenantModuleConfigRequest request)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(sub, out var updatedByUserId))
        {
            return Unauthorized();
        }

        var result = await mediator.Send(new UpdateTenantModuleConfigCommand(tenantId, request, updatedByUserId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
