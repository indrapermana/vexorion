using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public abstract class BaseChildQueryService<TParent, TChild> : BaseService, IChildQueryService<TParent, TChild>
    where TParent : class, ITenantEntity
    where TChild : class, ITenantEntity, IEntityTraceability
{
    protected BaseChildQueryService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TChild>>>> GetAllForParentAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<TChild>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var items = await GetAllForParentCoreAsync(parentId, context, cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<TChild>>>.Success(items);
    }

    public async Task<ServiceResult<IEntityResponse<TChild>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IEntityResponse<TChild>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var entity = await GetByIdCoreAsync(id, context, cancellationToken);
        return entity is null
            ? ServiceResult<IEntityResponse<TChild>>.Failure(StatusCodes.Status404NotFound, "Entity not found.")
            : ServiceResult<IEntityResponse<TChild>>.Success(entity);
    }

    protected abstract Task<IReadOnlyCollection<IEntityListResponse<TChild>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken);

    protected abstract Task<IEntityResponse<TChild>?> GetByIdCoreAsync(Guid id, AppDbContext context, CancellationToken cancellationToken);
}
