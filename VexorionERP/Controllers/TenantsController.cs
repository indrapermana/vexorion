using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;

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
}
