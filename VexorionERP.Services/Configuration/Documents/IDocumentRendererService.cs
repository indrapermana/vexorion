using VexorionERP.Models;

namespace VexorionERP.Services;

public record RenderedDocumentResult(string FileName, string ContentType, byte[] Content);

public interface IDocumentRendererService
{
    Task<RenderedDocumentResult> RenderAsync(
        Guid tenantId,
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        GeneratedDocumentFormat format,
        CancellationToken cancellationToken = default);
}
