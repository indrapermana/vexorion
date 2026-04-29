using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class DeleteInventoryBalanceCommandHandler(IServiceProvider serviceProvider)
    : DeleteCommandHandlerBase<DeleteInventoryBalanceCommand, InventoryBalance>(serviceProvider)
{
    protected override Guid GetEntityId(DeleteInventoryBalanceCommand request) => request.InventoryBalanceId;
}
