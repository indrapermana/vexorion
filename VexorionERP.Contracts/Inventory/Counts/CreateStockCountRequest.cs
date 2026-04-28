using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateStockCountRequest : ICreateInput<StockCount>
{
    [Required]
    public string CountNumber { get; set; } = string.Empty;
    public Guid WarehouseId { get; set; }
    public DateOnly CountDate { get; set; }
    public string? Notes { get; set; }
}
