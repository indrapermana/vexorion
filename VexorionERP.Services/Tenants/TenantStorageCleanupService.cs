using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;

namespace VexorionERP.Services;

public sealed class TenantStorageCleanupService(
    AppDbContext dbContext,
    IDocumentStorageService documentStorageService,
    IProductImageStorageService productImageStorageService) : ITenantStorageCleanupService
{
    public async Task<ServiceResult<bool>> DeleteTenantObjectsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var documentPaths = await GetDocumentPathsAsync(tenantId, cancellationToken);
        foreach (var path in documentPaths)
        {
            var deletion = await documentStorageService.DeleteAsync(path, cancellationToken);
            if (!deletion.Succeeded)
            {
                return ServiceResult<bool>.Failure(
                    StatusCodes.Status502BadGateway,
                    "The tenant could not be deleted because a stored document could not be removed. Please try again.");
            }
        }

        var productMedia = await dbContext.Products
            .IgnoreQueryFilters()
            .Where(product => product.TenantId == tenantId)
            .Select(product => new { product.ImageUrl, product.ThumbnailUrl })
            .ToListAsync(cancellationToken);

        try
        {
            foreach (var media in productMedia
                .DistinctBy(item => (item.ImageUrl, item.ThumbnailUrl)))
            {
                await productImageStorageService.DeleteAsync(
                    media.ImageUrl,
                    media.ThumbnailUrl,
                    cancellationToken);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return ServiceResult<bool>.Failure(
                StatusCodes.Status502BadGateway,
                "The tenant could not be deleted because stored product images could not be removed. Please try again.");
        }

        return ServiceResult<bool>.Success(true);
    }

    private async Task<IReadOnlyCollection<string>> GetDocumentPathsAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var currentDocumentPaths = await dbContext.ProjectDocuments
            .IgnoreQueryFilters()
            .Where(document => document.TenantId == tenantId)
            .Select(document => document.StoragePath)
            .ToListAsync(cancellationToken);
        var versionPaths = await dbContext.DocumentVersions
            .IgnoreQueryFilters()
            .Where(version => version.TenantId == tenantId)
            .Select(version => version.StoragePath)
            .ToListAsync(cancellationToken);
        var generatedDocumentPaths = await dbContext.GeneratedDocuments
            .IgnoreQueryFilters()
            .Where(document => document.TenantId == tenantId)
            .Select(document => document.BlobPath)
            .ToListAsync(cancellationToken);

        return currentDocumentPaths
            .Concat(versionPaths)
            .Concat(generatedDocumentPaths)
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }
}
