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
        var isPostgres = dbContext.Database.IsNpgsql();

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
            var tag = filter.Tag.Trim();
            if (isPostgres)
            {
                var tagPattern = $"%{EscapeLikePattern(tag)}%";
                query = query.Where(x => x.Tags != null && EF.Functions.ILike(x.Tags, tagPattern, "\\"));
            }
            else
            {
                var normalizedTag = tag.ToLower();
                query = query.Where(x => x.Tags != null && x.Tags.ToLower().Contains(normalizedTag));
            }
        }

        if (filter.FromUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc >= filter.FromUtc.Value);
        }

        if (filter.ToUtc.HasValue)
        {
            query = query.Where(x => x.CreatedAtUtc <= filter.ToUtc.Value);
        }

        List<ProjectDocumentSearchItemResponse> rows;
        if (string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            rows = await OrderAndLimit(query).ToListAsync(cancellationToken);
        }
        else
        {
            rows = await SearchAsync(
                query,
                filter.SearchTerm.Trim(),
                isPostgres,
                cancellationToken);
        }

        return ServiceResult<IReadOnlyCollection<ProjectDocumentSearchItemResponse>>.Success(rows);
    }

    private static async Task<List<ProjectDocumentSearchItemResponse>> SearchAsync(
        IQueryable<ProjectDocumentSearchItemResponse> query,
        string term,
        bool isPostgres,
        CancellationToken cancellationToken)
    {
        IQueryable<ProjectDocumentSearchItemResponse> documentMatches;
        IQueryable<ProjectDocumentSearchItemResponse> projectMatches;
        IQueryable<ProjectDocumentSearchItemResponse> categoryMatches;

        if (isPostgres)
        {
            var pattern = $"%{EscapeLikePattern(term)}%";
            documentMatches = query.Where(x =>
                EF.Functions.ILike(x.Title, pattern, "\\")
                || EF.Functions.ILike(x.FileName, pattern, "\\")
                || EF.Functions.ILike(x.DocumentNumber, pattern, "\\")
                || (x.Tags != null && EF.Functions.ILike(x.Tags, pattern, "\\")));
            projectMatches = query.Where(x =>
                EF.Functions.ILike(x.ProjectName, pattern, "\\")
                || EF.Functions.ILike(x.ProjectNumber, pattern, "\\"));
            categoryMatches = query.Where(x =>
                EF.Functions.ILike(x.ProjectCategoryCode, pattern, "\\"));
        }
        else
        {
            // The test provider does not implement PostgreSQL ILIKE. Keep the same
            // case-insensitive substring semantics for provider-independent tests.
            var normalizedTerm = term.ToLower();
            documentMatches = query.Where(x =>
                x.Title.ToLower().Contains(normalizedTerm)
                || x.FileName.ToLower().Contains(normalizedTerm)
                || x.DocumentNumber.ToLower().Contains(normalizedTerm)
                || (x.Tags != null && x.Tags.ToLower().Contains(normalizedTerm)));
            projectMatches = query.Where(x =>
                x.ProjectName.ToLower().Contains(normalizedTerm)
                || x.ProjectNumber.ToLower().Contains(normalizedTerm));
            categoryMatches = query.Where(x =>
                x.ProjectCategoryCode.ToLower().Contains(normalizedTerm));
        }

        // A cross-table OR causes PostgreSQL to apply the search after joining and
        // prevents its trigram indexes from narrowing each source table. The top 500
        // rows in the union must occur in the top 500 of at least one branch.
        var matches = new Dictionary<Guid, ProjectDocumentSearchItemResponse>();
        foreach (var branch in new[] { documentMatches, projectMatches, categoryMatches })
        {
            foreach (var row in await OrderAndLimit(branch).ToListAsync(cancellationToken))
            {
                matches.TryAdd(row.Id, row);
            }
        }

        return matches.Values
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenBy(x => x.ProjectName)
            .ThenBy(x => x.Title)
            .Take(500)
            .ToList();
    }

    private static IQueryable<ProjectDocumentSearchItemResponse> OrderAndLimit(
        IQueryable<ProjectDocumentSearchItemResponse> query) =>
        query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenBy(x => x.ProjectName)
            .ThenBy(x => x.Title)
            .Take(500);

    private static string EscapeLikePattern(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}
