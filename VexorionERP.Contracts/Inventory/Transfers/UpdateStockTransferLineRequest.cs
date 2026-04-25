using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Inventory.Transfers;

public class UpdateStockTransferLineRequest
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitCost { get; set; }
}