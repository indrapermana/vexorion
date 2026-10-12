using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UploadProjectDocumentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<UploadProjectDocumentCommand, ServiceResult<ProjectDocumentUploadResponse>>
{
    public async ValueTask<ServiceResult<ProjectDocumentUploadResponse>> Handle(
        UploadProjectDocumentCommand request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var storageService = serviceProvider.GetRequiredService<IDocumentStorageService>();
        var accountingService = serviceProvider.GetRequiredService<IStorageAccountingService>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var auditLogger = serviceProvider.GetRequiredService<IAuditLogger>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<ProjectDocumentUploadResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        // Check quota before uploading
        var quotaCheck = await accountingService.CheckQuotaAsync(tenantId.Value, request.File.Length, dbContext, cancellationToken);
        if (!quotaCheck.Succeeded)
            return ServiceResult<ProjectDocumentUploadResponse>.Failure(quotaCheck.StatusCode ?? StatusCodes.Status507InsufficientStorage, quotaCheck.ErrorMessage!);

        // Upload the file to blob storage
        using var stream = request.File.OpenReadStream();
        var uploadResult = await storageService.UploadAsync(
            tenantId.Value,
            "project-documents",
            request.File.FileName,
            stream,
            request.File.ContentType ?? "application/octet-stream",
            cancellationToken);

        if (!uploadResult.Succeeded)
            return ServiceResult<ProjectDocumentUploadResponse>.Failure(
                uploadResult.StatusCode ?? StatusCodes.Status502BadGateway,
                uploadResult.ErrorMessage ?? "File upload failed.");

        var blob = uploadResult.Value!;

        // Generate a unique document number
        var documentNumber = $"DOC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

        var actorUserId = GetActorUserId(httpContextAccessor);

        // Create document entity
        var document = new ProjectDocument
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            ProjectId = request.ProjectId,
            DocumentFolderId = request.DocumentFolderId,
            DocumentNumber = documentNumber,
            Title = request.Title,
            FileName = request.File.FileName,
            ContentType = request.File.ContentType ?? "application/octet-stream",
            StoragePath = blob.BlobPath,
            FileSizeBytes = blob.FileSizeBytes,
            CurrentVersionNumber = 1,
            Status = ManagedDocumentStatus.Draft,
            Tags = request.Tags,
            Notes = request.Notes,
            IsActive = true
        };
        dbContext.ProjectDocuments.Add(document);

        // Create the initial version record
        var version = new DocumentVersion
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            ProjectDocumentId = document.Id,
            VersionNumber = 1,
            FileName = request.File.FileName,
            ContentType = request.File.ContentType ?? "application/octet-stream",
            StoragePath = blob.BlobPath,
            FileSizeBytes = blob.FileSizeBytes,
            Checksum = blob.ChecksumSha256,
            UploadedByUserId = actorUserId,
            UploadedAtUtc = DateTime.UtcNow,
            Notes = request.Notes,
            IsActive = true
        };
        dbContext.DocumentVersions.Add(version);

        // Create policy rows for related tenant parties so cross-tenant collaborators can be constrained per document.
        var relatedParties = await dbContext.ProjectParties
            .GetByTenant(tenantId.Value)
            .Where(x => x.ProjectId == request.ProjectId && x.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var party in relatedParties)
        {
            var validFromUtc = party.EffectiveFrom?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var validToUtc = party.EffectiveTo?.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

            dbContext.DocumentAccessPolicies.Add(new DocumentAccessPolicy
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId.Value,
                ProjectDocumentId = document.Id,
                SubjectTenantId = party.RelatedTenantId,
                CanView = party.CanViewDocuments,
                CanDownload = party.CanViewDocuments,
                CanUploadVersion = party.CanUploadDocuments,
                ValidFromUtc = validFromUtc,
                ValidToUtc = validToUtc,
                IsActive = true
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Record in storage ledger (pass the saved dbContext — ledger will SaveChanges again)
        await accountingService.RecordLedgerEntryAsync(
            tenantId.Value,
            blob.FileSizeBytes,
            "upload",
            request.ProjectId,
            document.Id,
            actorUserId,
            documentNumber,
            dbContext,
            cancellationToken);

        await auditLogger.LogAsync(
            "project_document.uploaded",
            tenantId,
            actorUserId,
            null,
            nameof(ProjectDocument),
            document.Id.ToString(),
            "Project document uploaded.",
            new { document.ProjectId, document.DocumentNumber, document.Title, document.FileName, document.FileSizeBytes },
            cancellationToken);

        var response = new ProjectDocumentUploadResponse
        {
            Id = document.Id,
            DocumentNumber = document.DocumentNumber,
            Title = document.Title,
            FileName = document.FileName,
            FileSizeBytes = document.FileSizeBytes,
            CurrentVersionNumber = document.CurrentVersionNumber
        };

        return ServiceResult<ProjectDocumentUploadResponse>.Success(response);
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var value = accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
