using Mediator;
using Microsoft.Extensions.DependencyInjection;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateManualJournalCommandHandler(IServiceProvider serviceProvider)
    : IRequestHandler<CreateManualJournalCommand, ServiceResult<JournalEntryDetailsResponse>>
{
    public async ValueTask<ServiceResult<JournalEntryDetailsResponse>> Handle(CreateManualJournalCommand command, CancellationToken cancellationToken)
    {
        var service = serviceProvider.GetRequiredService<IPostingService>();
        var request = command.Request;
        return PostingResultMapper.ToServiceResult(await service.CreateManualJournalAsync(
            request.PostingDate, request.Description, request.Lines, cancellationToken));
    }
}
