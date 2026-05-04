using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class GeneratedDocumentService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IDocumentRendererService documentRendererService,
    IDocumentStorageService documentStorageService,
    IAuditLogger auditLogger) : IGeneratedDocumentService
{
    public async Task<ServiceResult<GeneratedDocumentResponse>> GenerateAsync(GenerateDocumentRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<GeneratedDocumentResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (request.SourceEntityId == Guid.Empty)
        {
            return ServiceResult<GeneratedDocumentResponse>.Failure(StatusCodes.Status400BadRequest, "Source entity id is required.");
        }

        if (!request.ForceRegenerate)
        {
            var existing = await dbContext.GeneratedDocuments
                .AsNoTracking()
                .Where(x => x.TenantId == tenantId.Value
                    && x.SourceType == request.SourceType
                    && x.SourceEntityId == request.SourceEntityId
                    && x.Format == request.Format
                    && x.Status == GeneratedDocumentStatus.Ready)
                .OrderByDescending(x => x.Version)
                .FirstOrDefaultAsync(cancellationToken);

            if (existing is not null)
            {
                var downloadUrlResult = await documentStorageService.GetDownloadUrlAsync(existing.BlobPath, cancellationToken);
                var existingResponse = ToResponse(existing, downloadUrlResult.Succeeded ? downloadUrlResult.Value : null);
                return ServiceResult<GeneratedDocumentResponse>.Success(existingResponse);
            }
        }

        return await GenerateNewVersionAsync(
            tenantId.Value,
            request.SourceType,
            request.SourceEntityId,
            request.Format,
            supersedePriorVersions: false,
            cancellationToken);
    }

    public async Task<ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>> ListBySourceAsync(
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (sourceEntityId == Guid.Empty)
        {
            return ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>.Failure(StatusCodes.Status400BadRequest, "Source entity id is required.");
        }

        var entities = await dbContext.GeneratedDocuments
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId.Value
                && x.SourceType == sourceType
                && x.SourceEntityId == sourceEntityId)
            .OrderByDescending(x => x.GeneratedAtUtc)
            .ThenByDescending(x => x.Version)
            .ToListAsync(cancellationToken);

        var response = entities
            .Select(x => ToResponse(x, null))
            .ToArray();

        return ServiceResult<IReadOnlyCollection<GeneratedDocumentResponse>>.Success(response);
    }

    public async Task<ServiceResult<GetDocumentDownloadLinkResponse>> GetDownloadLinkAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<GetDocumentDownloadLinkResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.GeneratedDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == generatedDocumentId && x.TenantId == tenantId.Value, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<GetDocumentDownloadLinkResponse>.Failure(StatusCodes.Status404NotFound, "Generated document not found.");
        }

        var downloadUrlResult = await documentStorageService.GetDownloadUrlAsync(entity.BlobPath, cancellationToken);
        if (!downloadUrlResult.Succeeded)
        {
            return ServiceResult<GetDocumentDownloadLinkResponse>.Failure(
                downloadUrlResult.StatusCode ?? StatusCodes.Status500InternalServerError,
                downloadUrlResult.ErrorMessage ?? "Failed to resolve download URL.");
        }

        await auditLogger.LogAsync(
            eventType: "documents.download_link.requested",
            tenantId: tenantId.Value,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(GeneratedDocument),
            entityId: entity.Id.ToString(),
            description: "Document download link resolved.",
            metadata: new { entity.SourceType, entity.SourceEntityId, entity.Format, entity.Version },
            cancellationToken: cancellationToken);

        return ServiceResult<GetDocumentDownloadLinkResponse>.Success(new GetDocumentDownloadLinkResponse
        {
            GeneratedDocumentId = entity.Id,
            DownloadUrl = downloadUrlResult.Value ?? string.Empty,
        });
    }

    public async Task<ServiceResult<DocumentInlineContentResponse>> GetInlineContentAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.GeneratedDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == generatedDocumentId && x.TenantId == tenantId.Value, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(StatusCodes.Status404NotFound, "Generated document not found.");
        }

        var downloadResult = await documentStorageService.DownloadAsync(entity.BlobPath, cancellationToken);
        if (!downloadResult.Succeeded)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(
                downloadResult.StatusCode ?? StatusCodes.Status500InternalServerError,
                downloadResult.ErrorMessage ?? "Failed to download document content.");
        }

        await auditLogger.LogAsync(
            eventType: "documents.inline.requested",
            tenantId: tenantId.Value,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(GeneratedDocument),
            entityId: entity.Id.ToString(),
            description: "Document inline content requested.",
            metadata: new { entity.SourceType, entity.SourceEntityId, entity.Format, entity.Version },
            cancellationToken: cancellationToken);

        return ServiceResult<DocumentInlineContentResponse>.Success(new DocumentInlineContentResponse
        {
            GeneratedDocumentId = entity.Id,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            Content = downloadResult.Value ?? [],
        });
    }

    public async Task<ServiceResult<DocumentInlineContentResponse>> GetPdfPreviewAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.GeneratedDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == generatedDocumentId && x.TenantId == tenantId.Value, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(StatusCodes.Status404NotFound, "Generated document not found.");
        }

        if (entity.Format != GeneratedDocumentFormat.Docx)
        {
            return ServiceResult<DocumentInlineContentResponse>.Failure(StatusCodes.Status400BadRequest, "PDF preview is only supported for DOCX generated documents.");
        }

        var renderedPreview = await documentRendererService.RenderAsync(
            tenantId.Value,
            entity.SourceType,
            entity.SourceEntityId,
            GeneratedDocumentFormat.Pdf,
            cancellationToken);

        await auditLogger.LogAsync(
            eventType: "documents.preview_pdf.requested",
            tenantId: tenantId.Value,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(GeneratedDocument),
            entityId: entity.Id.ToString(),
            description: "Document PDF preview requested.",
            metadata: new { entity.SourceType, entity.SourceEntityId, SourceFormat = entity.Format, PreviewFormat = GeneratedDocumentFormat.Pdf, entity.Version },
            cancellationToken: cancellationToken);

        return ServiceResult<DocumentInlineContentResponse>.Success(new DocumentInlineContentResponse
        {
            GeneratedDocumentId = entity.Id,
            FileName = Path.ChangeExtension(entity.FileName, ".pdf") ?? $"document-preview-{entity.Id:N}.pdf",
            ContentType = renderedPreview.ContentType,
            Content = renderedPreview.Content,
        });
    }

    public async Task<ServiceResult<GeneratedDocumentResponse>> RegenerateAsync(Guid generatedDocumentId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<GeneratedDocumentResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await dbContext.GeneratedDocuments
            .FirstOrDefaultAsync(x => x.Id == generatedDocumentId && x.TenantId == tenantId.Value, cancellationToken);

        if (entity is null)
        {
            return ServiceResult<GeneratedDocumentResponse>.Failure(StatusCodes.Status404NotFound, "Generated document not found.");
        }

        return await GenerateNewVersionAsync(
            tenantId.Value,
            entity.SourceType,
            entity.SourceEntityId,
            entity.Format,
            supersedePriorVersions: true,
            cancellationToken);
    }

    private async Task<ServiceResult<GeneratedDocumentResponse>> GenerateNewVersionAsync(
        Guid tenantId,
        GeneratedDocumentSourceType sourceType,
        Guid sourceEntityId,
        GeneratedDocumentFormat format,
        bool supersedePriorVersions,
        CancellationToken cancellationToken)
    {
        if (supersedePriorVersions)
        {
            var readyVersions = await dbContext.GeneratedDocuments
                .Where(x => x.TenantId == tenantId
                    && x.SourceType == sourceType
                    && x.SourceEntityId == sourceEntityId
                    && x.Format == format
                    && x.Status == GeneratedDocumentStatus.Ready)
                .ToListAsync(cancellationToken);

            foreach (var readyVersion in readyVersions)
            {
                readyVersion.Status = GeneratedDocumentStatus.Superseded;
            }
        }

        var currentMaxVersion = await dbContext.GeneratedDocuments
            .Where(x => x.TenantId == tenantId
                && x.SourceType == sourceType
                && x.SourceEntityId == sourceEntityId
                && x.Format == format)
            .Select(x => (int?)x.Version)
            .MaxAsync(cancellationToken) ?? 0;

        var nextVersion = currentMaxVersion + 1;

        var rendered = await documentRendererService.RenderAsync(tenantId, sourceType, sourceEntityId, format, cancellationToken);
        await using var contentStream = new MemoryStream(rendered.Content);

        var uploadResult = await documentStorageService.UploadAsync(
            tenantId,
            sourceType.ToString(),
            rendered.FileName,
            contentStream,
            rendered.ContentType,
            cancellationToken);

        if (!uploadResult.Succeeded)
        {
            return ServiceResult<GeneratedDocumentResponse>.Failure(
                uploadResult.StatusCode ?? StatusCodes.Status500InternalServerError,
                uploadResult.ErrorMessage ?? "Failed to upload generated document.");
        }

        var uploaded = uploadResult.Value!;
        var now = DateTime.UtcNow;
        var document = new GeneratedDocument
        {
            TenantId = tenantId,
            SourceType = sourceType,
            SourceEntityId = sourceEntityId,
            Format = format,
            Status = GeneratedDocumentStatus.Ready,
            Version = nextVersion,
            FileName = rendered.FileName,
            ContentType = rendered.ContentType,
            BlobPath = uploaded.BlobPath,
            ChecksumSha256 = uploaded.ChecksumSha256,
            FileSizeBytes = uploaded.FileSizeBytes,
            GeneratedAtUtc = now,
            GeneratedByUserId = Guid.Empty,
        };

        dbContext.GeneratedDocuments.Add(document);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            eventType: supersedePriorVersions ? "documents.regenerated" : "documents.generated",
            tenantId: tenantId,
            actorUserId: null,
            targetUserId: null,
            entityName: nameof(GeneratedDocument),
            entityId: document.Id.ToString(),
            description: supersedePriorVersions ? "Document regenerated." : "Document generated.",
            metadata: new { document.SourceType, document.SourceEntityId, document.Format, document.Version },
            cancellationToken: cancellationToken);

        return ServiceResult<GeneratedDocumentResponse>.Success(ToResponse(document, uploaded.BlobUrl));
    }

    private static GeneratedDocumentResponse ToResponse(GeneratedDocument entity, string? downloadUrl)
    {
        return new GeneratedDocumentResponse
        {
            GeneratedDocumentId = entity.Id,
            SourceType = entity.SourceType,
            SourceEntityId = entity.SourceEntityId,
            Format = entity.Format,
            Status = entity.Status,
            Version = entity.Version,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            BlobPath = entity.BlobPath,
            DownloadUrl = downloadUrl,
            GeneratedAtUtc = entity.GeneratedAtUtc,
        };
    }
}
