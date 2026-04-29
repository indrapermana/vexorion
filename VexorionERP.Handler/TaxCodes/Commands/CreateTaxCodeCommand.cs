using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record CreateTaxCodeCommand(CreateTaxCodeRequest Request) : IRequest<ServiceResult<TaxCodeDetailsResponse>>;
