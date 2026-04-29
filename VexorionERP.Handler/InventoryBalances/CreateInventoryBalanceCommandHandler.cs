using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class CreateInventoryBalanceCommandHandler(IServiceProvider serviceProvider)
    : CreateCommandHandlerBase<CreateInventoryBalanceCommand, InventoryBalance, CreateInventoryBalanceRequest, InventoryBalanceDetailsResponse>(serviceProvider)
{
    protected override CreateInventoryBalanceRequest GetCreateRequest(CreateInventoryBalanceCommand request) => request.Request;
}
