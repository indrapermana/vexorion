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

        var topProjects = await (
            from document in dbContext.ProjectDocuments.AsNoTracking()
            join project in dbContext.Projects.AsNoTracking() on document.ProjectId equals project.Id
            where document.TenantId == request.TenantId
            group document by new { document.ProjectId, project.Name } into documentGroup
            select new StorageTopProjectConsumerItem
            {
                ProjectId = documentGroup.Key.ProjectId,
                ProjectName = documentGroup.Key.Name,
                TotalBytes = documentGroup.Sum(item => item.FileSizeBytes),
                DocumentCount = documentGroup.Count()
            })
            .OrderByDescending(item => item.TotalBytes)
            .ThenBy(item => item.ProjectName)
            .Take(request.Take)
            .ToListAsync(cancellationToken);

        var topDocuments = await dbContext.ProjectDocuments
            .AsNoTracking()
            .Where(d => d.TenantId == request.TenantId)
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
            .ToListAsync(cancellationToken);

        return ServiceResult<StorageTopConsumersResponse>.Success(new StorageTopConsumersResponse
        {
            TenantId = request.TenantId,
            TopProjects = topProjects,
            TopDocuments = topDocuments
        });
    }
}
