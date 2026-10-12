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

public sealed class GetProjectDocumentsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectDocumentsQuery, ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>> Handle(
        GetProjectDocumentsQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var nowUtc = DateTime.UtcNow;

        var query = dbContext.ProjectDocuments
            .AsNoTracking()
            .Where(x => x.ProjectId == request.ProjectId)
            .Where(x =>
                x.TenantId == tenantId.Value
                || dbContext.DocumentAccessPolicies.Any(policy =>
                    policy.ProjectDocumentId == x.Id
                    && policy.SubjectTenantId == tenantId.Value
                    && policy.CanView
                    && (!policy.ValidFromUtc.HasValue || policy.ValidFromUtc.Value <= nowUtc)
                    && (!policy.ValidToUtc.HasValue || policy.ValidToUtc.Value >= nowUtc)));

        if (request.DocumentFolderId.HasValue)
        {
            query = query.Where(x => x.DocumentFolderId == request.DocumentFolderId.Value);
        }

        if (request.Status.HasValue)
        {
            query = query.Where(x => x.Status == request.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.Title.ToLower().Contains(term)
                || x.DocumentNumber.ToLower().Contains(term)
                || x.FileName.ToLower().Contains(term)
                || (x.Tags != null && x.Tags.ToLower().Contains(term)));
        }

        var entities = await query
            .OrderByDescending(x => x.CurrentVersionNumber)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        var mapped = entities
            .Select(item => item.Adapt<ProjectDocumentListItemResponse>())
            .ToArray();

        return ServiceResult<IReadOnlyCollection<ProjectDocumentListItemResponse>>.Success(mapped);
    }
}
