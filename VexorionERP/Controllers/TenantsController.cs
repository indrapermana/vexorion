using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts.Tenancy;
using VexorionERP.Services;
using VexorionERP.Services.Results;

namespace VexorionERP.Controllers;

[ApiController]
[Route("api/tenants")]
public class TenantsController(
    ITenantOnboardingService tenantOnboardingService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("onboard")]
    public async Task<ActionResult<OnboardTenantResponse>> Onboard([FromBody] OnboardTenantRequest request)
    {
        var result = await tenantOnboardingService.OnboardAsync(request, User, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    private ActionResult<T> ToActionResult<T>(ServiceResult<T> result)
    {
        if (result.Succeeded)
        {
            return Ok(result.Value);
        }

        if (result.Validation is not null)
        {
            return BadRequest(result.Validation);
        }

        return result.StatusCode switch
        {
            403 => Forbid(),
            409 => Conflict(new { message = result.ErrorMessage }),
            _ => BadRequest(new { message = result.ErrorMessage })
        };
    }
}