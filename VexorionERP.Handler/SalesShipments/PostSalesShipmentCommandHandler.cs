using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostSalesShipmentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostSalesShipmentCommand, ServiceResult<SalesShipmentDetailsResponse>>
{
    public async ValueTask<ServiceResult<SalesShipmentDetailsResponse>> Handle(PostSalesShipmentCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<ISalesShipmentPostingService>();
        return await postingService.PostAsync(request.ShipmentId, cancellationToken);
    }
}
