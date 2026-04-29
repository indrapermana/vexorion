using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInventoryBalanceByIdQueryHandler(IServiceProvider serviceProvider)
    : GetByIdQueryHandlerBase<GetInventoryBalanceByIdQuery, InventoryBalance, InventoryBalanceDetailsResponse>(serviceProvider)
{
    protected override Guid GetEntityId(GetInventoryBalanceByIdQuery request) => request.InventoryBalanceId;
}
