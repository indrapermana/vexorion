using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/imports")]
[Authorize]
public class ImportsController(
    IMediator mediator) : ServiceResultControllerBase
{
    [HttpGet("types")]
    [Authorize(Policy = AppPermissions.Imports.Validate)]
    public async Task<ActionResult<IReadOnlyCollection<AvailableImportTypeResponse>>> GetAvailableTypes()
    {
        var result = await mediator.Send(new GetAvailableImportTypesQuery(), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("template/{importType}")]
    [Authorize(Policy = AppPermissions.Imports.Validate)]
    public async Task<ActionResult<ImportTemplateResponse>> DownloadTemplate(string importType)
    {
        var result = await mediator.Send(new DownloadImportTemplateQuery(importType), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("validate")]
    [Authorize(Policy = AppPermissions.Imports.Validate)]
    public async Task<ActionResult<ImportValidationResultResponse>> Validate([FromForm] IFormFile file, [FromForm] string importType)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, HttpContext.RequestAborted);

        var request = new ValidateImportFileRequest
        {
            ImportType = importType,
            FileName = file.FileName,
            FileContent = ms.ToArray()
        };

        var result = await mediator.Send(new ValidateImportFileCommand(request), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpPost("{importJobId:guid}/submit")]
    [Authorize(Policy = AppPermissions.Imports.Submit)]
    public async Task<ActionResult<ImportJobStatusResponse>> Submit(Guid importJobId)
    {
        var result = await mediator.Send(new SubmitImportJobCommand(importJobId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("{importJobId:guid}/status")]
    [Authorize(Policy = AppPermissions.Imports.ViewHistory)]
    public async Task<ActionResult<ImportJobStatusResponse>> GetStatus(Guid importJobId)
    {
        var result = await mediator.Send(new GetImportJobStatusQuery(importJobId), HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [HttpGet("history")]
    [Authorize(Policy = AppPermissions.Imports.ViewHistory)]
    public async Task<ActionResult<IReadOnlyCollection<ImportJobHistoryItemResponse>>> GetHistory(
        [FromQuery] string? importType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await mediator.Send(
            new GetImportHistoryQuery(importType, page, pageSize), HttpContext.RequestAborted);
        return ToActionResult(result);
    }
}
