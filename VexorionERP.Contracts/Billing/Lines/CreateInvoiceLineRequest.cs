using System.ComponentModel.DataAnnotations;

namespace VexorionERP.Contracts.Billing.Lines;

public class CreateInvoiceLineRequest
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitPrice { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal TaxAmount { get; set; }
}