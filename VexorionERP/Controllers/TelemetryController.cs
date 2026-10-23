using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VexorionERP.Contracts;
using VexorionERP.Contracts.Telemetry;
using VexorionERP.Handler;

namespace VexorionERP;

[ApiController]
[Route("api/telemetry")]
[Authorize]
public class TelemetryController(IMediator mediator, ILogger<TelemetryController> logger) : ServiceResultControllerBase
{
    [HttpPost("client-errors")]
    [EnableRateLimiting("client-diagnostics")]
    public ActionResult TrackClientError([FromBody] ClientDiagnosticRequest request)
    {
        logger.LogWarning(
            "Client diagnostic {Application} {EventName}; API status {ApiStatus}; API code {ApiCode}; client trace {ClientTraceId}; request trace {RequestTraceId}",
            request.Application,
            request.EventName,
            request.ApiStatus,
            request.ApiCode,
            request.ClientTraceId,
            HttpContext.TraceIdentifier);

        return Accepted();
    }

    [HttpPost("page-visits")]
    public async Task<ActionResult> TrackPageVisit([FromBody] TrackPageVisitRequest request)
    {
        var result = await mediator.Send(new TrackTenantPageVisitCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
