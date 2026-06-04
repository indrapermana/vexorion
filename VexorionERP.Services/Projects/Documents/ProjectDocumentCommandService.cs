using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class ProjectDocumentCommandService(
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger,
    IHttpContextAccessor httpContextAccessor)
    : BaseCommandService<ProjectDocument>(currentTenantProvider)
{
    // Status transitions that are permitted
    private static readonly IReadOnlyDictionary<ManagedDocumentStatus, IReadOnlyCollection<ManagedDocumentStatus>> AllowedTransitions =
        new Dictionary<ManagedDocumentStatus, IReadOnlyCollection<ManagedDocumentStatus>>
        {
            [ManagedDocumentStatus.Draft] = [ManagedDocumentStatus.InReview, ManagedDocumentStatus.Archived],
            [ManagedDocumentStatus.InReview] = [ManagedDocumentStatus.Approved, ManagedDocumentStatus.Rejected, ManagedDocumentStatus.Draft],
            [ManagedDocumentStatus.Approved] = [ManagedDocumentStatus.Submitted, ManagedDocumentStatus.Archived],
            [ManagedDocumentStatus.Submitted] = [ManagedDocumentStatus.Archived],
            [ManagedDocumentStatus.Rejected] = [ManagedDocumentStatus.Draft],
            [ManagedDocumentStatus.Archived] = []
        };

    public static bool IsTransitionAllowed(ManagedDocumentStatus from, ManagedDocumentStatus to)
        => AllowedTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public async Task<ServiceResult<ProjectDocumentDetailsResponse>> ChangeStatusAsync(
        Guid documentId,
        ChangeProjectDocumentStatusRequest request,
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var tenantId = TryGetTenantId();
        if (!tenantId.HasValue)
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var document = await dbContext.ProjectDocuments
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == documentId, cancellationToken);

        if (document is null)
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(StatusCodes.Status404NotFound, "Document not found.");

        if (!IsTransitionAllowed(document.Status, request.NewStatus))
        {
            return ServiceResult<ProjectDocumentDetailsResponse>.Failure(
                StatusCodes.Status422UnprocessableEntity,
                $"Cannot transition document from '{document.Status}' to '{request.NewStatus}'.");
        }

        var previousStatus = document.Status;
        document.Status = request.NewStatus;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(
            "project_document.status_changed",
            tenantId,
            GetActorUserId(httpContextAccessor),
            null,
            nameof(ProjectDocument),
            document.Id.ToString(),
            "Document status changed.",
            new { PreviousStatus = previousStatus, NewStatus = request.NewStatus, document.Title, document.DocumentNumber, Reason = request.Reason },
            cancellationToken);

        return ServiceResult<ProjectDocumentDetailsResponse>.Success(document.Adapt<ProjectDocumentDetailsResponse>());
    }

    public override async Task<ServiceResult<bool>> DeleteAsync(Guid id, AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        var result = await base.DeleteAsync(id, dbContext, cancellationToken);

        if (result.Succeeded)
        {
            var tenantId = TryGetTenantId();
            await auditLogger.LogAsync(
                "project_document.deleted",
                tenantId,
                GetActorUserId(httpContextAccessor),
                null,
                nameof(ProjectDocument),
                id.ToString(),
                "Document deleted.",
                null,
                cancellationToken);
        }

        return result;
    }

    protected override async Task<ProjectDocument> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<ProjectDocument> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateProjectDocumentRequest)input;
        var entity = await context.ProjectDocuments
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
            return null!;

        entity.Title = request.Title.Trim();
        entity.DocumentFolderId = request.DocumentFolderId;
        entity.Tags = string.IsNullOrWhiteSpace(request.Tags) ? null : request.Tags.Trim();
        entity.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<ProjectDocument> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.ProjectDocuments
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity!;
    }

    private static Guid? GetActorUserId(IHttpContextAccessor accessor)
    {
        var userId = accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
