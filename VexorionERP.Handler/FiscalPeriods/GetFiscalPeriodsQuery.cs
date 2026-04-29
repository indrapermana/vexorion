using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetFiscalPeriodsQuery() : IRequest<ServiceResult<IReadOnlyCollection<FiscalPeriodListItemResponse>>>;
