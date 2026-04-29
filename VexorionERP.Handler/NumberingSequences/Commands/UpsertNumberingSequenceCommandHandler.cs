using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpsertNumberingSequenceCommandHandler(INumberingService numberingService)
    : IRequestHandler<UpsertNumberingSequenceCommand, ServiceResult<NumberingSequenceResponse>>
{
    public ValueTask<ServiceResult<NumberingSequenceResponse>> Handle(UpsertNumberingSequenceCommand request, CancellationToken cancellationToken)
    {
        return new ValueTask<ServiceResult<NumberingSequenceResponse>>(
            numberingService.UpsertAsync(request.Request, cancellationToken));
    }
}
