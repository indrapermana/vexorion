using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostPurchaseInvoiceCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostPurchaseInvoiceCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(PostPurchaseInvoiceCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPostingService>();
        var result = await postingService.PostPurchaseInvoiceAsync(
            request.PurchaseInvoiceId,
            request.Request.PayableAccountId,
            request.Request.ExpenseAccountId,
            request.Request.TaxReceivableAccountId,
            request.Request.PostingDate,
            cancellationToken);

        return PostingResultMapper.ToServiceResult(result);
    }
}
