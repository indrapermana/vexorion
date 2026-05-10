using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectListItemResponse>>> GetAll(
        [FromQuery] ProjectLifecycleStatus? status,
        [FromQuery] Guid? relatedTenantId)
    {
        var result = await mediator.Send(new GetProjectsQuery(status, relatedTenantId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{projectId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<ProjectDetailsResponse>> GetById(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectByIdQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{projectId:guid}/timeline")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectTimelineItemResponse>>> GetTimeline(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectTimelineQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectDetailsResponse>> Create([FromBody] CreateProjectRequest request)
    {
        var result = await mediator.Send(new CreateProjectCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { projectId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{projectId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectDetailsResponse>> Update(Guid projectId, [FromBody] UpdateProjectRequest request)
    {
        var result = await mediator.Send(new UpdateProjectCommand(projectId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{projectId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult> Delete(Guid projectId)
    {
        var result = await mediator.Send(new DeleteProjectCommand(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
