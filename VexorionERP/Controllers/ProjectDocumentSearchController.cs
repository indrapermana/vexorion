using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/project-documents")]
[Authorize]
public class ProjectDocumentSearchController(IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet("search")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>> Search(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? projectCategoryId,
        [FromQuery] ManagedDocumentStatus? status,
        [FromQuery] string? tag,
        [FromQuery] string? searchTerm,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc)
    {
        var filter = new ProjectDocumentSearchFilterRequest
        {
            ProjectId = projectId,
            ProjectCategoryId = projectCategoryId,
            Status = status,
            Tag = tag,
            SearchTerm = searchTerm,
            FromUtc = fromUtc,
            ToUtc = toUtc
        };

        var result = await mediator.Send(new SearchProjectDocumentsQuery(filter), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
