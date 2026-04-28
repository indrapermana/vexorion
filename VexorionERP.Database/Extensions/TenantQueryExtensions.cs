using Microsoft.EntityFrameworkCore;
using VexorionERP.Models;

namespace VexorionERP.Database;

/// <summary>
/// Extension methods for tenant-safe database queries.
/// Ensures all queries automatically filter by tenant ID to prevent cross-tenant data leakage.
/// </summary>
public static class TenantQueryExtensions
{
    /// <summary>
    /// Returns a tenant-filtered query for the specified entity type from the DbContext.
    /// </summary>
    /// <typeparam name="T">Entity type that implements ITenantEntity</typeparam>
    /// <param name="dbContext">Application DbContext</param>
    /// <param name="tenantId">The tenant ID to filter by</param>
    /// <returns>Filtered queryable containing only entities for the specified tenant</returns>
    public static IQueryable<T> GetByTenant<T>(this AppDbContext dbContext, Guid tenantId)
        where T : class, ITenantEntity
    {
        if (tenantId == Guid.Empty)
        {
            throw new ArgumentException("TenantId cannot be empty.", nameof(tenantId));
        }

        return dbContext.Set<T>().Where(entity => entity.TenantId == tenantId);
    }

    /// <summary>
    /// Returns an IQueryable filtered to the specified tenant.
    /// This method ensures tenant ID filtering is mandatory and cannot be forgotten.
    /// </summary>
    /// <typeparam name="T">Entity type that implements ITenantEntity</typeparam>
    /// <param name="query">The queryable source</param>
    /// <param name="tenantId">The tenant ID to filter by</param>
    /// <returns>Filtered queryable containing only entities for the specified tenant</returns>
    public static IQueryable<T> GetByTenant<T>(this IQueryable<T> query, Guid tenantId)
        where T : class, ITenantEntity
    {
        if (tenantId == Guid.Empty)
        {
            throw new ArgumentException("TenantId cannot be empty.", nameof(tenantId));
        }

        return query.Where(entity => entity.TenantId == tenantId);
    }

    /// <summary>
    /// Returns an IQueryable filtered to the specified tenant.
    /// This method ensures tenant ID filtering is mandatory and cannot be forgotten.
    /// </summary>
    /// <typeparam name="T">Entity type that implements ITenantEntity</typeparam>
    /// <param name="dbSet">The DbSet source</param>
    /// <param name="tenantId">The tenant ID to filter by</param>
    /// <returns>Filtered queryable containing only entities for the specified tenant</returns>
    public static IQueryable<T> GetByTenant<T>(this DbSet<T> dbSet, Guid tenantId)
        where T : class, ITenantEntity
    {
        if (tenantId == Guid.Empty)
        {
            throw new ArgumentException("TenantId cannot be empty.", nameof(tenantId));
        }

        return dbSet.Where(entity => entity.TenantId == tenantId);
    }
}
