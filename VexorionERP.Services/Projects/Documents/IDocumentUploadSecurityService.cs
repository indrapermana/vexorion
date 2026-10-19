using Microsoft.AspNetCore.Http;

namespace VexorionERP.Services;

public sealed record DocumentUploadSecurityResult(string ContentType);

public interface IDocumentUploadSecurityService
{
    Task<ServiceResult<DocumentUploadSecurityResult>> ValidateAsync(
        IFormFile file,
        CancellationToken cancellationToken = default);
}
