using Mediator;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class GetAllQueryHandlerBase<TRequest, TEntity, TListItem>(IServiceProvider serviceProvider)
    : BaseHandler<TEntity>(serviceProvider),
        IRequestHandler<TRequest, ServiceResult<IReadOnlyCollection<TListItem>>>
    where TRequest : IRequest<ServiceResult<IReadOnlyCollection<TListItem>>>
    where TEntity : class
{
    public async ValueTask<ServiceResult<IReadOnlyCollection<TListItem>>> Handle(
        TRequest request,
        CancellationToken cancellationToken)
    {
        var result = await QueryService.GetAllAsync(DbContext, cancellationToken);
        return MapList<TListItem>(result);
    }
}