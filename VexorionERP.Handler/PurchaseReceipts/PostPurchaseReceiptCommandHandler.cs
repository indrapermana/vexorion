using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostPurchaseReceiptCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostPurchaseReceiptCommand, ServiceResult<PurchaseReceiptDetailsResponse>>
{
    public async ValueTask<ServiceResult<PurchaseReceiptDetailsResponse>> Handle(PostPurchaseReceiptCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPurchaseReceiptPostingService>();
        return await postingService.PostAsync(request.ReceiptId, cancellationToken);
    }
}
