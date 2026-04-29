using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public abstract class CreateCommandHandlerBase<TRequest, TEntity, TCreateRequest, TDetails>(
    IServiceProvider serviceProvider)
    : BaseHandler<TEntity>(serviceProvider),
        IRequestHandler<TRequest, ServiceResult<TDetails>>
    where TRequest : IRequest<ServiceResult<TDetails>>
    where TEntity : class
    where TCreateRequest : ICreateInput<TEntity>
{
    public async ValueTask<ServiceResult<TDetails>> Handle(TRequest request, CancellationToken cancellationToken)
    {
        var result = await CommandService.CreateAsync(GetCreateRequest(request), DbContext, cancellationToken);
        return MapDetails<TDetails>(result);
    }

    protected abstract TCreateRequest GetCreateRequest(TRequest request);
}