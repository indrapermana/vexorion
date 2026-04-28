using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class UpdateStockTransferLineRequest : IUpdateLineRequest<StockTransferLine>
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitCost { get; set; }
}
