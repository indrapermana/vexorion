using VexorionERP.Models;

namespace VexorionERP.Services;

public class DocumentRendererService(DocumentDataLoader dataLoader) : IDocumentRendererService
{
    public async Task<RenderedDocumentResult> RenderAsync(
        Guid tenantId,
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        GeneratedDocumentFormat format,
        CancellationToken cancellationToken = default)
    {
        var model = await dataLoader.LoadAsync(tenantId, sourceType, sourceEntityId, cancellationToken);

        byte[] content;
        string extension;
        string contentType;

        if (format == GeneratedDocumentFormat.Docx)
        {
            content = DocxDocumentRenderer.Render(model);
            extension = "docx";
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        else
        {
            content = PdfDocumentRenderer.Render(model);
            extension = "pdf";
            contentType = "application/pdf";
        }

        var slug = sourceType.ToString().ToLowerInvariant();
        var fileName = $"{slug}-{sourceEntityId:N}.{extension}";

        return new RenderedDocumentResult(fileName, contentType, content);
    }
}
