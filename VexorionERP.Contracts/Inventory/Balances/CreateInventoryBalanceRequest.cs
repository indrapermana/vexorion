using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Balances;

public class CreateInventoryBalanceRequest
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal QuantityOnHand { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal QuantityReserved { get; set; }
}