using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/project-categories")]
[Authorize]
public class ProjectCategoriesController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectCategoryListItemResponse>>> GetAll()
    {
        var result = await mediator.Send(new GetProjectCategoriesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.View)]
    public async Task<ActionResult<ProjectCategoryDetailsResponse>> GetById(Guid categoryId)
    {
        var result = await mediator.Send(new GetProjectCategoryByIdQuery(categoryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectCategoryDetailsResponse>> Create([FromBody] CreateProjectCategoryRequest request)
    {
        var result = await mediator.Send(new CreateProjectCategoryCommand(request), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            return ToActionResult(result);
        }

        return CreatedAtAction(nameof(GetById), new { categoryId = result.Value!.Id }, result.Value);
    }

    [HttpPut("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult<ProjectCategoryDetailsResponse>> Update(Guid categoryId, [FromBody] UpdateProjectCategoryRequest request)
    {
        var result = await mediator.Send(new UpdateProjectCategoryCommand(categoryId, request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpDelete("{categoryId:guid}")]
    [Authorize(Policy = AppPermissions.Projects.Manage)]
    public async Task<ActionResult> Delete(Guid categoryId)
    {
        var result = await mediator.Send(new DeleteProjectCategoryCommand(categoryId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
