using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTaxCodeByIdQuery(Guid TaxCodeId) : IRequest<ServiceResult<TaxCodeDetailsResponse>>;
