using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record UpdateTaxCodeCommand(Guid TaxCodeId, UpdateTaxCodeRequest Request)
    : IRequest<ServiceResult<TaxCodeDetailsResponse>>;
