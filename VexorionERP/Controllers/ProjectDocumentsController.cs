using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Handler;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/projects/{projectId:guid}")]
[Authorize]
public class ProjectDocumentsController(
    IMediator mediator,
    IAuditLogger auditLogger,
    ICurrentTenantProvider currentTenantProvider) : ServiceResultControllerBase
{
    [HttpGet("folders")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<IReadOnlyCollection<DocumentFolderListItemResponse>>> GetFolders(Guid projectId, [FromQuery] Guid? parentFolderId)
    {
        var result = await mediator.Send(new GetDocumentFoldersQuery(projectId, parentFolderId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("view.folders", projectId, null, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpGet("folders/{folderId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<DocumentFolderDetailsResponse>> GetFolderById(Guid projectId, Guid folderId)
    {
        var result = await mediator.Send(new GetDocumentFolderByIdQuery(folderId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("view.folder", projectId, folderId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpPost("folders")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult<DocumentFolderDetailsResponse>> CreateFolder(Guid projectId, [FromBody] CreateDocumentFolderRequest request)
    {
        request.ProjectId = projectId;
        var result = await mediator.Send(new CreateDocumentFolderCommand(request), HttpContext.RequestAborted);

        await AuditAccessDecisionAsync("manage.folder.create", projectId, null, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);

        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetFolderById), new { projectId, folderId = result.Value!.Id }, result.Value);
    }

    [HttpPut("folders/{folderId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult<DocumentFolderDetailsResponse>> UpdateFolder(Guid projectId, Guid folderId, [FromBody] UpdateDocumentFolderRequest request)
    {
        var result = await mediator.Send(new UpdateDocumentFolderCommand(folderId, request), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("manage.folder.update", projectId, folderId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpDelete("folders/{folderId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult> DeleteFolder(Guid projectId, Guid folderId)
    {
        var result = await mediator.Send(new DeleteDocumentFolderCommand(folderId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("manage.folder.delete", projectId, folderId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpGet("documents")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>> GetDocuments(
        Guid projectId,
        [FromQuery] Guid? documentFolderId,
        [FromQuery] ManagedDocumentStatus? status,
        [FromQuery] string? searchTerm)
    {
        var result = await mediator.Send(new GetProjectDocumentsQuery(projectId, documentFolderId, status, searchTerm), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("view.documents", projectId, null, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpGet("documents/{documentId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<ProjectDocumentDetailsResponse>> GetDocumentById(Guid projectId, Guid documentId)
    {
        var result = await mediator.Send(new GetProjectDocumentByIdQuery(documentId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("view.document", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpPost("documents/upload")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Upload)]
    [RequestSizeLimit(104_857_600)] // 100 MB safeguard; plan/file-size limits are still enforced by business rules.
    public async Task<ActionResult<ProjectDocumentUploadResponse>> UploadDocument(
        Guid projectId,
        [FromForm] string title,
        [FromForm] Guid? documentFolderId,
        [FromForm] string? tags,
        [FromForm] string? notes,
        [FromForm] IFormFile file)
    {
        var result = await mediator.Send(
            new UploadProjectDocumentCommand(projectId, documentFolderId, title, tags, notes, file),
            HttpContext.RequestAborted);

        await AuditAccessDecisionAsync("upload.document", projectId, null, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);

        if (!result.Succeeded)
            return ToActionResult(result);

        return CreatedAtAction(nameof(GetDocumentById), new { projectId, documentId = result.Value!.Id }, result.Value);
    }

    [HttpPut("documents/{documentId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult<ProjectDocumentDetailsResponse>> UpdateDocument(
        Guid projectId,
        Guid documentId,
        [FromBody] UpdateProjectDocumentRequest request)
    {
        var result = await mediator.Send(new UpdateProjectDocumentCommand(documentId, request), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("manage.document.update", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpDelete("documents/{documentId:guid}")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult> DeleteDocument(Guid projectId, Guid documentId)
    {
        var result = await mediator.Send(new DeleteProjectDocumentCommand(documentId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("manage.document.delete", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpPost("documents/{documentId:guid}/status")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Manage)]
    public async Task<ActionResult<ProjectDocumentDetailsResponse>> ChangeStatus(
        Guid projectId,
        Guid documentId,
        [FromBody] ChangeProjectDocumentStatusRequest request)
    {
        var result = await mediator.Send(new ChangeProjectDocumentStatusCommand(documentId, request), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("manage.document.status", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpGet("documents/{documentId:guid}/versions")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.View)]
    public async Task<ActionResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>> GetVersions(Guid projectId, Guid documentId)
    {
        var result = await mediator.Send(new GetProjectDocumentVersionsQuery(documentId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("view.versions", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpPost("documents/{documentId:guid}/versions")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Upload)]
    [RequestSizeLimit(104_857_600)]
    public async Task<ActionResult<ProjectDocumentVersionListItemResponse>> AddVersion(
        Guid projectId,
        Guid documentId,
        [FromForm] string? notes,
        [FromForm] IFormFile file)
    {
        var result = await mediator.Send(new AddDocumentVersionCommand(documentId, notes, file), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("upload.version", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    [HttpGet("documents/{documentId:guid}/download")]
    [Authorize(Policy = AppPermissions.ProjectDocuments.Download)]
    public async Task<ActionResult<ProjectDocumentDownloadResponse>> GetDownload(Guid projectId, Guid documentId)
    {
        var result = await mediator.Send(new GetProjectDocumentDownloadQuery(documentId), HttpContext.RequestAborted);
        await AuditAccessDecisionAsync("download.document", projectId, documentId, result.Succeeded || result.StatusCode != StatusCodes.Status403Forbidden, result.ErrorMessage);
        return ToActionResult(result);
    }

    private async Task AuditAccessDecisionAsync(string action, Guid projectId, Guid? resourceId, bool granted, string? errorMessage)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var actorUserId = Guid.TryParse(actorClaim, out var parsed) ? (Guid?)parsed : null;
        var tenantId = currentTenantProvider.TenantId;

        await auditLogger.LogAsync(
            granted
                ? $"project.documents.{action}.access.granted"
                : $"project.documents.{action}.access.denied",
            tenantId,
            actorUserId,
            null,
            nameof(Project),
            projectId.ToString(),
            granted
                ? $"Project document action '{action}' permitted."
                : $"Project document action '{action}' denied.",
            new
            {
                ProjectId = projectId,
                ResourceId = resourceId,
                Action = action,
                Error = errorMessage
            },
            HttpContext.RequestAborted);
    }
}
