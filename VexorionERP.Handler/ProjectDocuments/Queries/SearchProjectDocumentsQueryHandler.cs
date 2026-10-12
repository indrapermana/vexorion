using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class SearchProjectDocumentsQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<SearchProjectDocumentsQuery, ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>>
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>> Handle(
        SearchProjectDocumentsQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>.Failure(
                StatusCodes.Status400BadRequest,
                "Tenant context is required.");
        }

        var filter = request.Filter ?? new ProjectDocumentSearchFilterRequest();
        var nowUtc = DateTime.UtcNow;

        var query =
            from document in dbContext.ProjectDocuments.AsNoTracking()
            join project in dbContext.Projects.AsNoTracking() on document.ProjectId equals project.Id
            join category in dbContext.ProjectCategories.AsNoTracking() on project.ProjectCategoryId equals category.Id
            where
                document.IsActive
                && project.IsActive
                && category.IsActive
                && (
                    document.TenantId == tenantId.Value
                    || dbContext.DocumentAccessPolicies.Any(policy =>
                        policy.ProjectDocumentId == document.Id
                        && policy.SubjectTenantId == tenantId.Value
                        && policy.CanView
                        && (!policy.ValidFromUtc.HasValue || policy.ValidFromUtc.Value <= nowUtc)
                        && (!policy.ValidToUtc.HasValue || policy.ValidToUtc.Value >= nowUtc)
                    )
                )
            select new ProjectDocumentSearchItemResponse
            {
                Id = document.Id,
                ProjectId = document.ProjectId,
                ProjectCategoryId = project.ProjectCategoryId,
                ProjectName = project.Name,
                ProjectNumber = project.ProjectNumber,
                ProjectCategoryCode = category.Code,
                DocumentNumber = document.DocumentNumber,
                Title = document.Title,
                FileName = document.FileName,
                ContentType = document.ContentType,
                FileSizeBytes = document.FileSizeBytes,
                CurrentVersionNumber = document.CurrentVersionNumber,
                Status = document.Status,
                Tags = document.Tags,
                CreatedAtUtc = document.CreatedAtUtc
            };

        if (filter.ProjectId.HasValue)
        {
            query = query.Where(x => x.ProjectId == filter.ProjectId.Value);
        }

        if (filter.ProjectCategoryId.HasValue)
        {
            query = query.Where(x => x.ProjectCategoryId == filter.ProjectCategoryId.Value);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(x => x.Status == filter.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Tag))
        {
            var normalizedTag = filter.Tag.Trim().ToLower();
            query = query.Where(x => x.Tags != null && x.Tags.ToLower().Contains(normalizedTag));
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            query = query.Where(x =>
                x.Title.ToLower().Contains(term)
                || x.FileName.ToLower().Contains(term)
                || x.DocumentNumber.ToLower().Contains(term)
                || x.ProjectName.ToLower().Contains(term)
                || x.ProjectNumber.ToLower().Contains(term)
                || x.ProjectCategoryCode.ToLower().Contains(term)
                || (x.Tags != null && x.Tags.ToLower().Contains(term)));
        }

        if (filter.FromUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= filter.FromUtc.Value);
        }

        if (filter.ToUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc <= filter.ToUtc.Value);
        }

        var rows = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenBy(x => x.ProjectName)
            .ThenBy(x => x.Title)
            .Take(500)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>.Success(rows);
    }
}
