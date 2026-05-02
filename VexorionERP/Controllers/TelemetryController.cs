using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;

namespace VexorionERP;

[ApiController]
[Route("api/telemetry")]
[Authorize]
public class TelemetryController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpPost("page-visits")]
    public async Task<ActionResult> TrackPageVisit([FromBody] TrackPageVisitRequest request)
    {
        var result = await mediator.Send(new TrackTenantPageVisitCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
