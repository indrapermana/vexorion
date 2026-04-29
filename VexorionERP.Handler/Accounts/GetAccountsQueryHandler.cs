using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetAccountsQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetAccountsQuery, Account, AccountListItemResponse>(serviceProvider);
