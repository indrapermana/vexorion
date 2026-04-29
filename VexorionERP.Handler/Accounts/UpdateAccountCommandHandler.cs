using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class UpdateAccountCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateAccountCommand, Account, UpdateAccountRequest, AccountDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateAccountCommand request) => request.AccountId;

    protected override UpdateAccountRequest GetUpdateRequest(UpdateAccountCommand request) => request.Request;
}
