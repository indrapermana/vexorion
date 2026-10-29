using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<AuditLogListResponse>> Get(
        [FromQuery] string? eventType,
        [FromQuery] string? entityName,
        [FromQuery] string? entityId,
        [FromQuery] string? correlationId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await mediator.Send(new GetAuditLogsQuery(eventType, entityName, entityId, correlationId, fromUtc, toUtc, page, pageSize), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("admin/lifecycle")]
    [Authorize(Policy = AppPermissions.Tenants.View, Roles = AppRoles.SystemAdmin)]
    public async Task<ActionResult<AuditLogListResponse>> GetAdminLifecycle(
        [FromQuery] Guid tenantId,
        [FromQuery] Guid? targetUserId,
        [FromQuery] bool tenantOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await mediator.Send(
            new GetAdminLifecycleAuditLogsQuery(tenantId, targetUserId, tenantOnly, page, pageSize),
            HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
