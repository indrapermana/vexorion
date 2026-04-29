using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpsertNumberingSequenceCommand(UpsertNumberingSequenceRequest Request)
    : IRequest<ServiceResult<NumberingSequenceResponse>>;
