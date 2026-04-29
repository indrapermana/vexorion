using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostVendorPaymentCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostVendorPaymentCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(PostVendorPaymentCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPostingService>();
        var result = await postingService.PostVendorPaymentAsync(
            request.VendorPaymentId,
            request.Request.PayableAccountId,
            request.Request.CashAccountId,
            request.Request.PostingDate,
            cancellationToken);

        return PostingResultMapper.ToServiceResult(result);
    }
}
