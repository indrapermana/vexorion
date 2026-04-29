using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostSalesInvoiceCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostSalesInvoiceCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(PostSalesInvoiceCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPostingService>();
        var result = await postingService.PostSalesInvoiceAsync(
            request.SalesInvoiceId,
            request.Request.ReceivableAccountId,
            request.Request.RevenueAccountId,
            request.Request.TaxLiabilityAccountId,
            request.Request.PostingDate,
            cancellationToken);

        return PostingResultMapper.ToServiceResult(result);
    }
}
