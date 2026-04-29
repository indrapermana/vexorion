using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class GetAccountByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetAccountByIdQuery, Account, AccountDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetAccountByIdQuery request) => request.AccountId;
}
