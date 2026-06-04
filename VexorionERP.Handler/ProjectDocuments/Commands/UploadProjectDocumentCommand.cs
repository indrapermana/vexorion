using Microsoft.AspNetCore.Http;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UploadProjectDocumentCommand(
    Guid ProjectId,
    Guid? DocumentFolderId,
    string Title,
    string? Tags,
    string? Notes,
    IFormFile File)
    : IRequest<ServiceResult<ProjectDocumentUploadResponse>>;
