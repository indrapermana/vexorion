using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/projects/{projectId:guid}/assignments")]
[Authorize]
public class ProjectAssignmentsController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectAssignmentListItemResponse>>> GetAll(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectAssignmentsQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("available-consultants")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectAssignableConsultantListItemResponse>>> GetAvailableConsultants(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectAssignableConsultantsQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("available-employees")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<EmployeeListItemResponse>>> GetAvailableEmployees(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectAssignableEmployeesQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("history")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectAssignmentHistoryItemResponse>>> GetHistory(Guid projectId)
    {
        var result = await mediator.Send(new GetProjectAssignmentHistoryQuery(projectId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{assignmentId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<ProjectAssignmentDetailsResponse>> GetById(Guid projectId, Guid assignmentId)
    {
        var result = await mediator.Send(new GetProjectAssignmentByIdQuery(projectId, assignmentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectAssignmentDetailsResponse>> Create(Guid projectId, [FromBody] CreateProjectAssignmentRequest request)
    {
        var result = await mediator.Send(new CreateProjectAssignmentCommand(projectId, request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { projectId, assignmentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{assignmentId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectAssignmentDetailsResponse>> Update(
        Guid projectId,
        Guid assignmentId,
        [FromBody] UpdateProjectAssignmentRequest request)
    {
        var result = await mediator.Send(new UpdateProjectAssignmentCommand(projectId, assignmentId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{assignmentId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult> Delete(Guid projectId, Guid assignmentId)
    {
        var result = await mediator.Send(new DeleteProjectAssignmentCommand(projectId, assignmentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
