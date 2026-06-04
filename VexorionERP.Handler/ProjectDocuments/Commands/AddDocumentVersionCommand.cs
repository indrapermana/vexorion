using Microsoft.AspNetCore.Http;
using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record AddDocumentVersionCommand(
    Guid ProjectDocumentId,
    string? Notes,
    IFormFile File)
    : IRequest<ServiceResult<ProjectDocumentVersionListItemResponse>>;
