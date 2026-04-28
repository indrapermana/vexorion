using VexorionERP.Database;
using VexorionERP.Contracts;

namespace VexorionERP.Services;

public interface ILineCommandService<TParent, TLine> : ICQRSService<TLine>
    where TParent : class
    where TLine : class
{
    Task<ServiceResult<ILineResponse<TLine>>> CreateAsync(Guid parentId, ICreateLineRequest<TLine> request, CancellationToken cancellationToken = default);

    Task<ServiceResult<ILineResponse<TLine>>> UpdateAsync(Guid parentId, Guid lineId, IUpdateLineRequest<TLine> request, CancellationToken cancellationToken = default);

    Task<ServiceResult<bool>> DeleteAsync(Guid parentId, Guid lineId, CancellationToken cancellationToken = default);
}