using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostCustomerPaymentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostCustomerPaymentCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(PostCustomerPaymentCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPostingService>();
        var result = await postingService.PostCustomerPaymentAsync(
            request.CustomerPaymentId,
            request.Request.CashAccountId,
            request.Request.ReceivableAccountId,
            request.Request.PostingDate,
            cancellationToken);

        return PostingResultMapper.ToServiceResult(result);
    }
}
