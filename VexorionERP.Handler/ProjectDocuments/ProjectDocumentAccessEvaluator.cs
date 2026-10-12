using Microsoft.EntityFrameworkCore;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Handler;

internal static class ProjectDocumentAccessEvaluator
{
    public static bool IsPolicyWindowActive(DocumentAccessPolicy policy, DateTime nowUtc)
    {
        if (policy.ValidFromUtc.HasValue && policy.ValidFromUtc.Value > nowUtc)
        {
            return false;
        }

        if (policy.ValidToUtc.HasValue && policy.ValidToUtc.Value < nowUtc)
        {
            return false;
        }

        return true;
    }

    public static Task<bool> CanViewAsync(AppDbContext dbContext, Guid documentId, Guid ownerTenantId, Guid requesterTenantId, DateTime nowUtc, CancellationToken cancellationToken)
        => CanAccessAsync(dbContext, documentId, ownerTenantId, requesterTenantId, nowUtc, p => p.CanView, cancellationToken);

    public static Task<bool> CanDownloadAsync(AppDbContext dbContext, Guid documentId, Guid ownerTenantId, Guid requesterTenantId, DateTime nowUtc, CancellationToken cancellationToken)
        => CanAccessAsync(dbContext, documentId, ownerTenantId, requesterTenantId, nowUtc, p => p.CanDownload, cancellationToken);

    public static Task<bool> CanUploadVersionAsync(AppDbContext dbContext, Guid documentId, Guid ownerTenantId, Guid requesterTenantId, DateTime nowUtc, CancellationToken cancellationToken)
        => CanAccessAsync(dbContext, documentId, ownerTenantId, requesterTenantId, nowUtc, p => p.CanUploadVersion, cancellationToken);

    private static async Task<bool> CanAccessAsync(
        AppDbContext dbContext,
        Guid documentId,
        Guid ownerTenantId,
        Guid requesterTenantId,
        DateTime nowUtc,
        Func<DocumentAccessPolicy, bool> permissionPredicate,
        CancellationToken cancellationToken)
    {
        if (ownerTenantId == requesterTenantId)
        {
            return true;
        }

        var policies = await dbContext.DocumentAccessPolicies
            .AsNoTracking()
            .Where(x => x.ProjectDocumentId == documentId && x.SubjectTenantId == requesterTenantId)
            .ToListAsync(cancellationToken);

        return policies.Any(policy => permissionPredicate(policy) && IsPolicyWindowActive(policy, nowUtc));
    }
}
