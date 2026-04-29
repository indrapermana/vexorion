using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class GetByIdQueryHandlerBase<TRequest, TEntity, TDetails>(IServiceProvider serviceProvider)
    : BaseHandler<TEntity>(serviceProvider),
        IRequestHandler<TRequest, ServiceResult<TDetails>>
    where TRequest : IRequest<ServiceResult<TDetails>>
    where TEntity : class
{
    public async ValueTask<ServiceResult<TDetails>> Handle(TRequest request, CancellationToken cancellationToken)
    {
        var result = await QueryService.GetByIdAsync(GetEntityId(request), DbContext, cancellationToken);
        return MapDetails<TDetails>(result);
    }

    protected abstract Guid GetEntityId(TRequest request);
}