using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/tenants/{tenantId:guid}/plans")]
[Authorize]
public class TenantPlansController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.TenantPlans.View)]
    public async Task<ActionResult<IReadOnlyCollection<TenantPlanResponse>>> GetAll(Guid tenantId)
    {
        var result = await mediator.Send(new GetTenantPlansQuery(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.TenantPlans.Manage)]
    public async Task<ActionResult<TenantPlanResponse>> Create(Guid tenantId, [FromBody] CreateTenantPlanRequest request)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var actorUserId = Guid.TryParse(actorClaim, out var parsedActorId) ? parsedActorId : (Guid?)null;
        var result = await mediator.Send(new CreateTenantPlanCommand(tenantId, request, actorUserId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
