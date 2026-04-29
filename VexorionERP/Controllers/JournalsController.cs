using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/journals")]
[Authorize]
public class JournalsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<IReadOnlyCollection<JournalEntryListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetJournalEntriesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{journalEntryId:guid}")]
    [Authorize(Policy = AppPermissions.Billing.View)]
    public async Task<ActionResult<JournalEntryDetailsResponse>> GetById(Guid journalEntryId)
    {
        var result = await mediator.Send(new GetJournalEntryByIdQuery(journalEntryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
