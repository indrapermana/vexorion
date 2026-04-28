using VexorionERP.Models;

namespace VexorionERP.Models;

public class Customer : TenantEntityBase
{
    public string CustomerNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BillingAddress { get; set; }
    public string? ShippingAddress { get; set; }
    public decimal CreditLimit { get; set; }

    public ICollection<SalesOrder> SalesOrders { get; set; } = [];
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<SalesInvoice> SalesInvoices { get; set; } = [];
    public ICollection<CustomerPayment> CustomerPayments { get; set; } = [];
}
