using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class PostManualJournalCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<PostManualJournalCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(PostManualJournalCommand command, CancellationToken cancellationToken)
    {
        var service = serviceProvider.GetRequiredService<IPostingService>();
        return PostingResultMapper.ToServiceResult(await service.PostManualJournalAsync(command.JournalEntryId, cancellationToken));
    }
}
