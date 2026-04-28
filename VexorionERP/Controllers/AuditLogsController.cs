using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController(
    IAuditLogQueryService auditLogQueryService) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Accounting.View)]
    public async Task<ActionResult<AuditLogListResponse>> Get(
        [FromQuery] string? eventType,
        [FromQuery] string? entityName,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await auditLogQueryService.GetAsync(eventType, entityName, fromUtc, toUtc, page, pageSize, HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
