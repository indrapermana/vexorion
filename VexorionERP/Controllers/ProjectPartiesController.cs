using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/projects/{projectId:guid}/parties")]
[Authorize]
public class ProjectPartiesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet("options")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    [ProducesResponseType<IReadOnlyCollection<ProjectPartyOptionResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectPartyOptionResponse>>> GetOptions(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectPartyOptionsQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectPartyListItemResponse>>> GetAll(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectPartiesQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{projectPartyId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<ProjectPartyDetailsResponse>> GetById(Guid projectId, Guid projectPartyId)
    {
        var result = await mediator.Send(new GetProjectPartyByIdQuery(projectId, projectPartyId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectPartyDetailsResponse>> Create(Guid projectId, [FromBody] CreateProjectPartyRequest request)
    {
        var result = await mediator.Send(new CreateProjectPartyCommand(projectId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { projectId, projectPartyId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{projectPartyId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectPartyDetailsResponse>> Update(
        Guid projectId,
        Guid projectPartyId,
        [FromBody] UpdateProjectPartyRequest request)
    {
        var result = await mediator.Send(new UpdateProjectPartyCommand(projectId, projectPartyId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{projectPartyId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult> Delete(Guid projectId, Guid projectPartyId)
    {
        var result = await mediator.Send(new DeleteProjectPartyCommand(projectId, projectPartyId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}