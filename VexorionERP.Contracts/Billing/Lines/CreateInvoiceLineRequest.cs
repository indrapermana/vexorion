using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreateInvoiceLineRequest : ICreateLineRequest<InvoiceLine>
{
    public Guid ProductId { get; set; }
    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Quantity { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal UnitPrice { get; set; }
    [Range(typeof(decimal), "0", "79228162514264337593543950335")]
    public decimal TaxAmount { get; set; }
}
