using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetNumberingSequencesQueryHandler(INumberingService numberingService)
    : IRequestHandler<GetNumberingSequencesQuery, ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>>
{
    public ValueTask<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>> Handle(GetNumberingSequencesQuery request, CancellationToken cancellationToken)
    {
        return new ValueTask<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>>(
            numberingService.GetAllAsync(cancellationToken));
    }
}
