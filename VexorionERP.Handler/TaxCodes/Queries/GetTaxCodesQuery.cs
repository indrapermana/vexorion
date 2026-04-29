using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetTaxCodesQuery() : IRequest<ServiceResult<IReadOnlyCollection<TaxCodeListItemResponse>>>;
