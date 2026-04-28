using VexorionERP.Contracts;
using VexorionERP.Database;

namespace VexorionERP.Services;

public interface IQueryService<T> : ICQRSService<T>
    where T : class
{
    Task<ServiceResult<IReadOnlyCollection<IEntityListResponse<T>>>> GetAllAsync(AppDbContext context, CancellationToken cancellationToken = default);
    Task<ServiceResult<IEntityResponse<T>>> GetByIdAsync(Guid customerId, AppDbContext context, CancellationToken cancellationToken = default);
}

