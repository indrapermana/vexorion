using Microsoft.AspNetCore.Http;
using VexorionERP.Contracts;

namespace VexorionERP.Services;

public abstract class BaseLineCommandService<TParent, TLine, TCreateRequest, TUpdateRequest> : ILineCommandService<TParent, TLine>
    where TParent : class
    where TLine : class
    where TCreateRequest : class, ICreateLineRequest<TLine>
    where TUpdateRequest : class, IUpdateLineRequest<TLine>
{
    public Task<ServiceResult<ILineResponse<TLine>>> CreateAsync(Guid parentId, ICreateLineRequest<TLine> request, CancellationToken cancellationToken = default)
    {
        if (request is not TCreateRequest typedRequest)
        {
            return Task.FromResult(ServiceResult<ILineResponse<TLine>>.Failure(StatusCodes.Status400BadRequest, "Invalid create line request."));
        }

        return CreateAsync(parentId, typedRequest, cancellationToken);
    }

    public Task<ServiceResult<ILineResponse<TLine>>> UpdateAsync(Guid parentId, Guid lineId, IUpdateLineRequest<TLine> request, CancellationToken cancellationToken = default)
    {
        if (request is not TUpdateRequest typedRequest)
        {
            return Task.FromResult(ServiceResult<ILineResponse<TLine>>.Failure(StatusCodes.Status400BadRequest, "Invalid update line request."));
        }

        return UpdateAsync(parentId, lineId, typedRequest, cancellationToken);
    }

    protected abstract Task<ServiceResult<ILineResponse<TLine>>> CreateAsync(Guid parentId, TCreateRequest request, CancellationToken cancellationToken = default);

    protected abstract Task<ServiceResult<ILineResponse<TLine>>> UpdateAsync(Guid parentId, Guid lineId, TUpdateRequest request, CancellationToken cancellationToken = default);

    public abstract Task<ServiceResult<bool>> DeleteAsync(Guid parentId, Guid lineId, CancellationToken cancellationToken = default);
}