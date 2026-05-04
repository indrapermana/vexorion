using System.Text;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class DocumentRendererService : IDocumentRendererService
{
    public Task<RenderedDocumentResult> RenderAsync(
        Guid tenantId,
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        GeneratedDocumentFormat format,
        CancellationToken cancellationToken = default)
    {
        var extension = format == GeneratedDocumentFormat.Docx ? "docx" : "pdf";
        var contentType = format == GeneratedDocumentFormat.Docx
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";

        // Baseline renderer output; this is the pluggable seam for full template renderers.
        var payload = $"Vexorion ERP Generated Document\nTenant: {tenantId}\nSourceType: {sourceType}\nSourceEntityId: {sourceEntityId}\nGeneratedAtUtc: {DateTime.UtcNow:O}\nFormat: {format}";
        var content = Encoding.UTF8.GetBytes(payload);
        var fileName = $"{sourceType.ToString().ToLowerInvariant()}-{sourceEntityId:N}-v1.{extension}";

        return Task.FromResult(new RenderedDocumentResult(fileName, contentType, content));
    }
}
