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

    [HttpGet("modules/effective")]
    [Authorize(Policy = AppPermissions.TenantModules.View)]
    public async Task<ActionResult<TenantModuleEffectiveAccessBatchResponse>> GetModuleEffectiveAccess()
    {
        var result = await mediator.Send(new GetTenantModuleEffectiveAccessBatchQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{tenantId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantListItemResponse>> Update(Guid tenantId, [FromBody] UpdateTenantRequest request)
    {
        var result = await mediator.Send(new UpdateTenantCommand(tenantId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{tenantId:guid}")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult> Delete(Guid tenantId)
    {
        var result = await mediator.Send(new DeleteTenantCommand(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{tenantId:guid}/preferences/menu")]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<TenantPreferencesResponse>> GetTenantMenuConfiguration(Guid tenantId)
    {
        var result = await mediator.Send(new GetTenantMenuConfigurationQuery(tenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut("{tenantId:guid}/preferences/menu")]
    [Authorize(Policy = AppPermissions.Tenants.Manage)]
    public async Task<ActionResult<TenantPreferencesResponse>> UpdateTenantMenuConfiguration(Guid tenantId, [FromBody] UpdateMenuConfigurationRequest request)
    {
        var result = await mediator.Send(new UpdateTenantMenuConfigurationForTenantCommand(tenantId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("telemetry")]
    [Authorize(Policy = AppPermissions.Tenants.View)]
    public async Task<ActionResult<TenantTelemetryResponse>> GetTelemetry(
        [FromQuery] int? rangeDays,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc)
    {
        if (rangeDays.HasValue)
        {
            if (rangeDays.Value != 7 && rangeDays.Value != 30)
            {
                return ApiFailure(StatusCodes.Status400BadRequest, "rangeDays only supports 7 or 30.", "tenant.range_days_invalid");
            }

            var now = DateTime.UtcNow;
            fromUtc = now.AddDays(-rangeDays.Value);
            toUtc ??= now;
        }

        var result = await mediator.Send(new GetTenantTelemetryQuery(fromUtc, toUtc), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
