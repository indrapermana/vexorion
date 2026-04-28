using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public abstract class BaseLineQueryService<TParent, TLine> : BaseService, ILineQueryService<TParent, TLine>
    where TParent : class, ITenantEntity, IEntityTraceability
    where TLine : class, ITenantEntity, IEntityTraceability
{
    protected BaseLineQueryService(ICurrentTenantProvider currentTenantProvider) : base(currentTenantProvider)
    {
    }

    protected virtual string ParentNotFoundMessage => "Parent entity not found.";

    protected virtual string LineNotFoundMessage => "Entity not found.";

    public async Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>> GetAllForParentAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (!await ParentExistsAsync(parentId, context, cancellationToken))
        {
            return ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>.Failure(StatusCodes.Status404NotFound, ParentNotFoundMessage);
        }

        var items = await GetAllForParentCoreAsync(parentId, context, cancellationToken);
        return ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>.Success(items);
    }

    public async Task<ServiceResult<IEntityResponse<TLine>>> GetByIdAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (!HasTenantContext)
        {
            return ServiceResult<IEntityResponse<TLine>>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        if (!await ParentExistsAsync(parentId, context, cancellationToken))
        {
            return ServiceResult<IEntityResponse<TLine>>.Failure(StatusCodes.Status404NotFound, ParentNotFoundMessage);
        }

        var entity = await GetByIdCoreAsync(parentId, lineId, context, cancellationToken);
        return entity is null
            ? ServiceResult<IEntityResponse<TLine>>.Failure(StatusCodes.Status404NotFound, LineNotFoundMessage)
            : ServiceResult<IEntityResponse<TLine>>.Success(entity);
    }

    protected virtual Task<bool> ParentExistsAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken)
        => Task.FromResult(true);

    protected abstract Task<IReadOnlyCollection<IEntityListResponse<TLine>>> GetAllForParentCoreAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken);

    protected abstract Task<IEntityResponse<TLine>?> GetByIdCoreAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken);
}