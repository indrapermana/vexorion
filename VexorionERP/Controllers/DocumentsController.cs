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
    [HttpGet("source/{sourceType}/{sourceEntityId:guid}")]
    [Authorize(Policy = AppPermissions.Documents.ViewOrDownloadPolicy)]
    public async Task<ActionResult<IReadOnlyCollection<GeneratedDocumentResponse>>> ListBySource(GeneratedDocumentSourceType sourceType, Guid sourceEntityId)
    {
        var result = await mediator.Send(new ListGeneratedDocumentsQuery(sourceType, sourceEntityId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

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

    [HttpGet("{generatedDocumentId:guid}/inline")]
    [Authorize(Policy = AppPermissions.Documents.ViewOrDownloadPolicy)]
    public async Task<ActionResult> GetInline(Guid generatedDocumentId)
    {
        var result = await mediator.Send(new GetDocumentInlineContentQuery(generatedDocumentId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            var failure = ToActionResult(result);
            return failure.Result ?? BadRequest();
        }

        var payload = result.Value!;
        Response.Headers.ContentDisposition = $"inline; filename=\"{payload.FileName}\"";
        return File(payload.Content, payload.ContentType);
    }

    [HttpGet("{generatedDocumentId:guid}/preview/pdf")]
    [Authorize(Policy = AppPermissions.Documents.ViewOrDownloadPolicy)]
    public async Task<ActionResult> GetPdfPreview(Guid generatedDocumentId)
    {
        var result = await mediator.Send(new GetDocumentPdfPreviewQuery(generatedDocumentId), HttpContext.RequestAborted);
        if (!result.Succeeded)
        {
            var failure = ToActionResult(result);
            return failure.Result ?? BadRequest();
        }

        var payload = result.Value!;
        Response.Headers.ContentDisposition = $"inline; filename=\"{payload.FileName}\"";
        return File(payload.Content, payload.ContentType);
    }

    [HttpPost("{generatedDocumentId:guid}/regenerate")]
    [Authorize(Policy = AppPermissions.Documents.Regenerate)]
    public async Task<ActionResult<GeneratedDocumentResponse>> Regenerate(Guid generatedDocumentId)
    {
        var result = await mediator.Send(new RegenerateDocumentCommand(generatedDocumentId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
