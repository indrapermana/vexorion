using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class ReverseJournalCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<ReverseJournalCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(ReverseJournalCommand request, CancellationToken cancellationToken)
    {
        var postingService = serviceProvider.GetRequiredService<IPostingService>();
        var result = await postingService.ReverseJournalAsync(
            request.JournalEntryId,
            request.Request.ReversalDate,
            cancellationToken);

        return PostingResultMapper.ToServiceResult(result);
    }
}
