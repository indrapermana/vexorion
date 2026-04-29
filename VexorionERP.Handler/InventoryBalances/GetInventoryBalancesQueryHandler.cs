using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP.Handler;

public sealed class GetInventoryBalancesQueryHandler(IServiceProvider serviceProvider)
    : GetAllQueryHandlerBase<GetInventoryBalancesQuery, InventoryBalance, InventoryBalanceListItemResponse>(serviceProvider);
