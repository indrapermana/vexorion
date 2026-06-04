using Mediator;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetProjectDocumentDownloadQueryHandler(IServiceProvider serviceProvider)
    : IRequestHandler<GetProjectDocumentDownloadQuery, ServiceResult<ProjectDocumentDownloadResponse>>
{
    public async ValueTask<ServiceResult<ProjectDocumentDownloadResponse>> Handle(
        GetProjectDocumentDownloadQuery request,
        CancellationToken cancellationToken)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();
        var storageService = serviceProvider.GetRequiredService<IDocumentStorageService>();
        var tenantProvider = serviceProvider.GetRequiredService<ICurrentTenantProvider>();

        var tenantId = tenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<ProjectDocumentDownloadResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");

        var document = await dbContext.ProjectDocuments
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == request.DocumentId, cancellationToken);

        if (document is null)
            return ServiceResult<ProjectDocumentDownloadResponse>.Failure(StatusCodes.Status404NotFound, "Document not found.");

        var urlResult = await storageService.GetDownloadUrlAsync(document.StoragePath, cancellationToken);
        if (!urlResult.Succeeded)
            return ServiceResult<ProjectDocumentDownloadResponse>.Failure(
                urlResult.StatusCode ?? StatusCodes.Status502BadGateway,
                urlResult.ErrorMessage ?? "Failed to generate download URL.");

        var response = new ProjectDocumentDownloadResponse
        {
            DownloadUrl = urlResult.Value!,
            FileName = document.FileName,
            ContentType = document.ContentType,
            FileSizeBytes = document.FileSizeBytes
        };

        return ServiceResult<ProjectDocumentDownloadResponse>.Success(response);
    }
}
