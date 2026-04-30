using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tenants")]
public class TenantsController(IMediator mediator) : ServiceResultControllerBase
{
    [AllowAnonymous]
    [HttpPost("onboard")]
    public async Task<ActionResult<OnboardTenantResponse>> Onboard([FromBody] OnboardTenantRequest request)
    {
        var result = await mediator.Send(new OnboardTenantCommand(request));
        return ToActionResult(result);
    }

    [HttpGet]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<IReadOnlyCollection<TenantListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetTenantsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{tenantId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantListItemResponse>> Update(Guid tenantId, [FromBody] UpdateTenantRequest request)
    {
        var result = await mediator.Send(new UpdateTenantCommand(tenantId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
