using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/consultants")]
[Authorize]
public class ConsultantsController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<IReadOnlyCollection<ConsultantListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetConsultantsQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{consultantId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.View)]
    public async Task<ActionResult<ConsultantDetailsResponse>> GetById(Guid consultantId)
    {
        var result = await mediator.Send(new GetConsultantByIdQuery(consultantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<ConsultantDetailsResponse>> Create([FromBody] CreateConsultantRequest request)
    {
        var result = await mediator.Send(new CreateConsultantCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { consultantId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{consultantId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult<ConsultantDetailsResponse>> Update(Guid consultantId, [FromBody] UpdateConsultantRequest request)
    {
        var result = await mediator.Send(new UpdateConsultantCommand(consultantId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{consultantId:guid}")]
    [Authorize(Policy = AppPermissions.Organization.Manage)]
    public async Task<ActionResult> Delete(Guid consultantId)
    {
        var result = await mediator.Send(new DeleteConsultantCommand(consultantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
