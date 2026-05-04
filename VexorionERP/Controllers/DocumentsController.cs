using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpPost("generate")]
    [Authorize(Policy = AppPermissions.Documents.Generate)]
    public async Task<ActionResult<GeneratedDocumentResponse>> Generate([FromBody] GenerateDocumentRequest request)
    {
        var result = await mediator.Send(new GenerateDocumentCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{generatedDocumentId:guid}/download-link")]
    [Authorize(Policy = AppPermissions.Documents.Download)]
    public async Task<ActionResult<GetDocumentDownloadLinkResponse>> GetDownloadLink(Guid generatedDocumentId)
    {
        var result = await mediator.Send(new GetDocumentDownloadLinkQuery(generatedDocumentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{generatedDocumentId:guid}/regenerate")]
    [Authorize(Policy = AppPermissions.Documents.Regenerate)]
    public async Task<ActionResult<GeneratedDocumentResponse>> Regenerate(Guid generatedDocumentId)
    {
        var result = await mediator.Send(new RegenerateDocumentCommand(generatedDocumentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
