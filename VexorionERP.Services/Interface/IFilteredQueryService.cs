using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface IFilteredQueryService<TEntity, in TFilter> : IQueryService<TEntity>
    where TEntity : class
{
    Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TEntity>>>> GetAllAsync(TFilter filter, AppDbContext context, CancellationToken cancellationToken = default);
}
