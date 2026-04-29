using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class DeleteCommandHandlerBase<TRequest, TEntity>(IServiceProvider serviceProvider)
    : BaseHandler<TEntity>(serviceProvider),
        IRequestHandler<TRequest, ServiceResult<bool>>
    where TRequest : IRequest<ServiceResult<bool>>
    where TEntity : class
{
    public ValueTask<ServiceResult<bool>> Handle(TRequest request, CancellationToken cancellationToken)
    {
        return new ValueTask<ServiceResult<bool>>(
            CommandService.DeleteAsync(GetEntityId(request), DbContext, cancellationToken));
    }

    protected abstract Guid GetEntityId(TRequest request);
}