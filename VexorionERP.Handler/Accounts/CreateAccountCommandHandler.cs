using VexorionERP.Contracts;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP.Handler;

public sealed class CreateAccountCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateAccountCommand, Account, CreateAccountRequest, AccountDetailsResponse>(serviceProvider)
{
    protected override CreateAccountRequest GetCreateRequest(CreateAccountCommand request) => request.Request;
}
