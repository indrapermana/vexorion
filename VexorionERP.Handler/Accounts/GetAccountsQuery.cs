using Mediator;
using VexorionERP.Contracts;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed record GetAccountsQuery : IRequest<ServiceResult<IReadOnlyCollection<AccountListItemResponse>>>;
