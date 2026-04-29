using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class UpdateCommandHandlerBase<TRequest, TEntity, TUpdateRequest, TDetails>(
    IServiceProvider serviceProvider)
    : BaseHandler<TEntity>(serviceProvider),
        IRequestHandler<TRequest, ServiceResult<TDetails>>
    where TRequest : IRequest<ServiceResult<TDetails>>
    where TEntity : class
    where TUpdateRequest : IUpdateInput<TEntity>
{
    public async ValueTask<ServiceResult<TDetails>> Handle(TRequest request, CancellationToken cancellationToken)
    {
        var result = await CommandService.UpdateAsync(
            GetEntityId(request),
            GetUpdateRequest(request),
            DbContext,
            cancellationToken);
        return MapDetails<TDetails>(result);
    }

    protected abstract Guid GetEntityId(TRequest request);

    protected abstract TUpdateRequest GetUpdateRequest(TRequest request);
}