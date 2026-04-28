using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface IChildQueryService<TParent, TChild> : ICQRSService<TChild>
    where TParent : class
    where TChild : class
{
    Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TChild>>>> GetAllForParentAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken = default);
    Task<ServiceResult<IEntityResponse<TChild>>> GetByIdAsync(Guid id, AppDbContext context, CancellationToken cancellationToken = default);
}
