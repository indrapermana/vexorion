using Mapster;
using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectDocumentVersionsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectDocumentVersionsQuery, ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>> Handle(
        GetProjectDocumentVersionsQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();
        var tenantId = tenantProvider.TenantId;

        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var document = await dbContext.ProjectDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.DocumentId, cancellationToken);

        if (document is null)
        {
            return ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Document not found.");
        }

        var canView = await ProjectDocumentAccessEvaluator.CanViewAsync(
            dbContext,
            document.Id,
            document.TenantId,
            tenantId.Value,
            DateTime.UtcNow,
            cancellationToken);

        if (!canView)
        {
            return ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>.Failure(
                StatusCodes.Status404NotFound,
                "Document not found.");
        }

        var versions = await dbContext.DocumentVersions
            .AsNoTracking()
            .Where(x => x.ProjectDocumentId == request.DocumentId)
            .OrderByDescending(x => x.VersionNumber)
            .ToListAsync(cancellationToken);

        var mapped = versions.Adapt<List<ProjectDocumentVersionListItemResponse>>();
        return ServiceResult<IReadOnlyCollection<ProjectDocumentVersionListItemResponse>>.Success(mapped);
    }
}
