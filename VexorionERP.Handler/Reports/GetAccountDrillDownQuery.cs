using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetAccountDrillDownQuery(Guid AccountId, DateOnly? StartDate, DateOnly EndDate) : IRequest<ServiceResult<AccountDrillDownResponse>>;
