using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Serilog;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public abstract class BaseQueryService<T> : BaseService, IQueryService<T>
    where T : class, ITenantEntity, IEntityTraceability
{
    public BaseQueryService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    public virtual async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<T>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var log = Log.ForContext(GetType());
        log.Information("{Service}.GetAllAsync called", GetType().Name);

        ArgumentNullException.ThrowIfNull(context, nameof(context));

        if (!HasTenantContext)
        {
            log.Error("{Service}.GetAllAsync failed: tenant context missing", GetType().Name);
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<T>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entities = await context.GetByTenant<T>(TenantId).AsNoTracking().ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyCollection<IEntityListResponse<T>>>.Success(AdaptEntityListResponses(entities));
    }

    public virtual async Task<ServiceResult<IEntityResponse<T>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        var log = Log.ForContext(GetType());
        log.Information("{Service}.GetByIdAsync called for {EntityId}", GetType().Name, id);

        ArgumentNullException.ThrowIfNull(context, nameof(context));

        if (!HasTenantContext)
        {
            log.Error("{Service}.GetByIdAsync failed: tenant context missing", GetType().Name);
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await context.GetByTenant<T>(TenantId).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity == null)
        {
            log.Error("{Service}.GetByIdAsync failed: entity not found {EntityId}", GetType().Name, id);
            return ServiceResult<IEntityResponse<T>>.Failure(StatusCodes.Status404NotFound, "Entity not found.");
        }

        return ServiceResult<IEntityResponse<T>>.Success(AdaptEntityResponse(entity));
    }
}