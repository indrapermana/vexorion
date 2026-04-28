using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateInventoryBalanceRequest : ICreateInput<InventoryBalance>
{
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal QuantityOnHand { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal QuantityReserved { get; set; }
}
