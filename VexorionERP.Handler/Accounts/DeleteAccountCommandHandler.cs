using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class DeleteAccountCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteAccountCommand, Account>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteAccountCommand request) => request.AccountId;
}
