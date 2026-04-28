using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateInventoryBalanceRequest : CreateInventoryBalanceRequest, IUpdateInput<InventoryBalance>
{
    public bool IsActive { get; set; } = true;
}
