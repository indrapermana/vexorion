using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateStockTransferLineRequest : ICreateLineRequest<StockTransferLine>
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitCost { get; set; }
}
