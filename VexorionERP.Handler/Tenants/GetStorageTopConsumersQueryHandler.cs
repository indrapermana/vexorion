using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetStorageTopConsumersQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetStorageTopConsumersQuery, ServiceResult<StorageTopConsumersResponse>>
{
    public async ValueTask<ServiceResult<StorageTopConsumersResponse>> Handle(
        GetStorageTopConsumersQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        var documents = await dbContext.ProjectDocuments
            .AsNoTracking()
            .Where(d => d.TenantId == request.TenantId)
            .Select(d => new
            {
                d.Id,
                d.ProjectId,
                d.Title,
                d.FileName,
                d.FileSizeBytes
            })
            .ToListAsync(cancellationToken);

        var projectIds = documents
            .Select(d => d.ProjectId)
            .Distinct()
            .ToList();

        var projectNames = projectIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await dbContext.Projects
                .AsNoTracking()
                .Where(p => p.TenantId == request.TenantId && projectIds.Contains(p.Id))
                .Select(p => new { p.Id, p.Name })
                .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);

        var topProjects = documents
            .GroupBy(d => d.ProjectId)
            .Select(g => new StorageTopProjectConsumerItem
            {
                ProjectId = g.Key,
                ProjectName = projectNames.TryGetValue(g.Key, out var name) ? name : "Unknown project",
                TotalBytes = g.Sum(x => x.FileSizeBytes),
                DocumentCount = g.Count()
            })
            .OrderByDescending(x => x.TotalBytes)
            .ThenBy(x => x.ProjectName)
            .Take(request.Take)
            .ToList();

        var topDocuments = documents
            .OrderByDescending(d => d.FileSizeBytes)
            .ThenBy(d => d.Title)
            .Take(request.Take)
            .Select(d => new StorageTopDocumentConsumerItem
            {
                ProjectDocumentId = d.Id,
                ProjectId = d.ProjectId,
                Title = d.Title,
                FileName = d.FileName,
                FileSizeBytes = d.FileSizeBytes
            })
            .ToList();

        return ServiceResult<StorageTopConsumersResponse>.Success(new StorageTopConsumersResponse
        {
            TenantId = request.TenantId,
            TopProjects = topProjects,
            TopDocuments = topDocuments
        });
    }
}