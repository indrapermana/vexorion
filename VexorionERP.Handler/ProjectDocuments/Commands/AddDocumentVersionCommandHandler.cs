using Microsoft.AspNetCore.Http;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class AddDocumentVersionCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<AddDocumentVersionCommand, ServiceResult<ProjectDocumentVersionListItemResponse>>
{
    public async ValueTask<ServiceResult<ProjectDocumentVersionListItemResponse>> Handle(
        AddDocumentVersionCommand request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var storageService = serviceProvider.GetRequiredService<IDocumentStorageService>();
        var accountingService = serviceProvider.GetRequiredService<IStorageAccountingService>();
        var securityService = serviceProvider.GetRequiredService<IDocumentUploadSecurityService>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var auditLogger = serviceProvider.GetRequiredService<IAuditLogger>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var document = await dbContext.ProjectDocuments
            .FirstOrDefaultAsync(x => x.Id == request.ProjectDocumentId, cancellationToken);

        if (document is null)
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(StatusCodes.Status404NotFound, "Document not found.");

        var canUploadVersion = await ProjectDocumentAccessEvaluator.CanUploadVersionAsync(
            dbContext,
            document.Id,
            document.TenantId,
            tenantId.Value,
            DateTime.UtcNow,
            cancellationToken);

        if (!canUploadVersion)
        {
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(StatusCodes.Status404NotFound, "Document not found.");
        }

        var quotaCheck = await accountingService.CheckQuotaAsync(tenantId.Value, request.File.Length, dbContext, cancellationToken);
        if (!quotaCheck.Succeeded)
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(quotaCheck.StatusCode ?? StatusCodes.Status507InsufficientStorage, quotaCheck.ErrorMessage!);

        var safeFileName = Path.GetFileName(request.File.FileName.Replace('\\', '/'));
        if (string.IsNullOrWhiteSpace(safeFileName))
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(StatusCodes.Status400BadRequest, "A valid file name is required.");

        var securityResult = await securityService.ValidateAsync(request.File, cancellationToken);
        if (!securityResult.Succeeded)
        {
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(
                securityResult.StatusCode ?? StatusCodes.Status400BadRequest,
                securityResult.ErrorMessage ?? "The file failed security validation.",
                securityResult.ErrorCode);
        }

        var contentType = securityResult.Value!.ContentType;

        using var stream = request.File.OpenReadStream();
        var uploadResult = await storageService.UploadAsync(
            tenantId.Value,
            "project-documents",
            safeFileName,
            stream,
            contentType,
            cancellationToken);

        if (!uploadResult.Succeeded)
            return ServiceResult<ProjectDocumentVersionListItemResponse>.Failure(
                uploadResult.StatusCode ?? StatusCodes.Status502BadGateway,
                uploadResult.ErrorMessage ?? "Version upload failed.");

        var blob = uploadResult.Value!;
        var nextVersion = document.CurrentVersionNumber + 1;
        var actorUserId = GetActorUserId(httpContextAccessor);

        var version = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            ProjectDocumentId = document.Id,
            VersionNumber = nextVersion,
            FileName = safeFileName,
            ContentType = contentType,
            StoragePath = blob.BlobPath,
            FileSizeBytes = blob.FileSizeBytes,
            Checksum = blob.ChecksumSha256,
            UploadedByUserId = actorUserId,
            UploadedAtUtc = DateTime.UtcNow,
            Notes = request.Notes,
            IsActive = true
        };
        dbContext.DocumentVersions.Add(version);

        document.CurrentVersionNumber = nextVersion;
        document.FileName = safeFileName;
        document.ContentType = contentType;
        document.StoragePath = blob.BlobPath;
        document.FileSizeBytes = blob.FileSizeBytes;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await storageService.DeleteAsync(blob.BlobPath, CancellationToken.None);
            throw;
        }

        await accountingService.RecordLedgerEntryAsync(
            tenantId.Value,
            blob.FileSizeBytes,
            "version_upload",
            document.ProjectId,
            document.Id,
            actorUserId,
            document.DocumentNumber,
            dbContext,
            cancellationToken);

        await auditLogger.LogAsync(
            "project_document.version_uploaded",
            tenantId,
            actorUserId,
            null,
            nameof(ProjectDocument),
            document.Id.ToString(),
            "Project document version uploaded.",
            new { document.ProjectId, document.DocumentNumber, VersionNumber = version.VersionNumber, version.FileName, version.FileSizeBytes },
            cancellationToken);

        var response = new ProjectDocumentVersionListItemResponse
        {
            Id = version.Id,
            ProjectDocumentId = version.ProjectDocumentId,
            VersionNumber = version.VersionNumber,
            FileName = version.FileName,
            ContentType = version.ContentType,
            FileSizeBytes = version.FileSizeBytes,
            Checksum = version.Checksum,
            UploadedByUserId = version.UploadedByUserId,
            UploadedAtUtc = version.UploadedAtUtc,
            Notes = version.Notes,
            IsActive = version.IsActive
        };

        return ServiceResult<ProjectDocumentVersionListItemResponse>.Success(response);
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var value = accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
