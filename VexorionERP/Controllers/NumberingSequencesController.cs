using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/numbering-sequences")]
[Authorize]
public class NumberingSequencesController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<NumberingSequenceResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetNumberingSequencesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPut]
    [Authorize(Policy = AppPermissions.Billing.Manage)]
    public async Task<ActionResult<NumberingSequenceResponse>> Upsert([FromBody] UpsertNumberingSequenceRequest request)
    {
        var result = await mediator.Send(new UpsertNumberingSequenceCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
