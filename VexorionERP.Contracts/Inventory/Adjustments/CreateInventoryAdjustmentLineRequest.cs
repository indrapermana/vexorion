using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Adjustments;

public class CreateInventoryAdjustmentLineRequest
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "-79228162514264337593543950335", "79228162514264337593543950335")]
    public decimal QuantityDelta { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitCost { get; set; }
    public string? Reason { get; set; }
}