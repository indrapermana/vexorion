using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public class DocumentFolderCommandService(ICurrentTenantProvider currentTenantProvider)
    : BaseCommandService<DocumentFolder>(currentTenantProvider)
{
    protected override async Task<ServiceResult<IEntityResponse<DocumentFolder>>?> ValidateCreateBusinessRulesAsync(
        ICreateInput<DocumentFolder> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (CreateDocumentFolderRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
            return null;

        var nameExists = await context.DocumentFolders
            .GetByTenant(tenantId.Value)
            .AnyAsync(
                x => x.ProjectId == request.ProjectId
                     && x.ParentFolderId == request.ParentFolderId
                     && x.Name.ToUpper() == request.Name.ToUpper().Trim(),
                cancellationToken);

        if (nameExists)
        {
            return ServiceResult<IEntityResponse<DocumentFolder>>.Failure(
                StatusCodes.Status409Conflict,
                "A folder with the same name already exists in this location.");
        }

        return null;
    }

    protected override async Task<ServiceResult<IEntityResponse<DocumentFolder>>?> ValidateUpdateBusinessRulesAsync(
        Guid id,
        IUpdateInput<DocumentFolder> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateDocumentFolderRequest)input;
        var tenantId = TryGetTenantId();

        if (!tenantId.HasValue)
            return null;

        var current = await context.DocumentFolders
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (current is null)
            return null;

        var nameExists = await context.DocumentFolders
            .GetByTenant(tenantId.Value)
            .AnyAsync(
                x => x.Id != id
                     && x.ProjectId == current.ProjectId
                     && x.ParentFolderId == current.ParentFolderId
                     && x.Name.ToUpper() == request.Name.ToUpper().Trim(),
                cancellationToken);

        if (nameExists)
        {
            return ServiceResult<IEntityResponse<DocumentFolder>>.Failure(
                StatusCodes.Status409Conflict,
                "A folder with the same name already exists in this location.");
        }

        return null;
    }

    protected override async Task<DocumentFolder> GetUpdatedDbObjectAsync(
        Guid id,
        IUpdateInput<DocumentFolder> input,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var request = (UpdateDocumentFolderRequest)input;
        var entity = await context.DocumentFolders
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
            return null!;

        entity.Name = request.Name.Trim();
        entity.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        entity.UpdatedAtUtc = DateTime.UtcNow;

        return entity;
    }

    protected override async Task<DocumentFolder> GetDeleteObjectAsync(
        Guid id,
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var entity = await context.DocumentFolders
            .GetByTenant(TenantId)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity!;
    }
}
