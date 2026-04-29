using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetNumberingSequencesQuery() : IRequest<ServiceResult<IReadOnlyCollection<NumberingSequenceResponse>>>;
