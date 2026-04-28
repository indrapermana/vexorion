using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface ICommandService<T> : IBaseCommandService<T>
    where T : class
{
    Task<ServiceResult<IEntityResponse<T>>> CreateAsync(ICreateInput<T> request, AppDbContext dbContext, CancellationToken cancellationToken = default);
    Task<T> GetAddToDbObjectAsync(ICreateInput<T> input, AppDbContext context, CancellationToken cancellationToken = default);
    Task<ServiceResult<IEntityResponse<T>>> UpdateAsync(Guid productId, IUpdateInput<T> request, AppDbContext dbContext, CancellationToken cancellationToken = default);
    Task<ServiceResult<bool>> DeleteAsync(Guid productId, AppDbContext dbContext, CancellationToken cancellationToken = default);
}

