using VexorionERP.Models;
using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts;

public class CreateSalesOrderRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string OrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid WarehouseId { get; set; }
    public DateOnly OrderDate { get; set; }
    public DateOnly RequiredDate { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    [Required]
    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "USD";
    [StringLength(1000)]
    public string? Notes { get; set; }
}
