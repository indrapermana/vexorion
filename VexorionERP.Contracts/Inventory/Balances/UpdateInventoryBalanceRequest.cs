namespace VexorionERP.Contracts.Inventory.Balances;

public class UpdateInventoryBalanceRequest : CreateInventoryBalanceRequest
{
    public bool IsActive { get; set; } = true;
}