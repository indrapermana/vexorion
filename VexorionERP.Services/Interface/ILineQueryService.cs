using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface ILineQueryService<TParent, TLine> : ICQRSService<TLine>
    where TParent : class
    where TLine : class
{
    Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<TLine>>>> GetAllForParentAsync(Guid parentId, AppDbContext context, CancellationToken cancellationToken = default);
    Task<ServiceResult<IEntityResponse<TLine>>> GetByIdAsync(Guid parentId, Guid lineId, AppDbContext context, CancellationToken cancellationToken = default);
}