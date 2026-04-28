namespace VexorionERP.Contracts;

public class UpdateInventoryBalanceRequest : CreateInventoryBalanceRequest
{
    public bool IsActive { get; set; } = true;
}
