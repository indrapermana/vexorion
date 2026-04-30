using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public abstract class BaseFilteredQueryService<TEntity, TFilter> : BaseQueryService<TEntity>, IFilteredQueryService<TEntity, TFilter>
    where TEntity : class, ITenantEntity, IEntityTraceability
{
    protected BaseFilteredQueryService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    protected abstract TFilter DefaultFilter { get; }

    public new Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
        => GetAllAsync(DefaultFilter, context, cancellationToken);

    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>>> GetAllAsync(TFilter filter, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entities = await ApplyOrdering(ApplyFilter(context.GetByTenant<TEntity>(TenantId).AsNoTracking(), filter))
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>>.Success(AdaptEntityListResponses(entities));
    }

    protected virtual IQueryable<TEntity> ApplyFilter(IQueryable<TEntity> query, TFilter filter) => query;

    protected virtual IQueryable<TEntity> ApplyOrdering(IQueryable<TEntity> query) => query;
}
