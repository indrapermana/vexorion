using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class UpdateInventoryBalanceCommandHandler(IServiceProvider serviceProvider)
    : UpdateCommandHandlerBase<UpdateInventoryBalanceCommand, InventoryBalance, UpdateInventoryBalanceRequest, InventoryBalanceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(UpdateInventoryBalanceCommand request) => request.InventoryBalanceId;

    protected override UpdateInventoryBalanceRequest GetUpdateRequest(UpdateInventoryBalanceCommand request) => request.Request;
}
