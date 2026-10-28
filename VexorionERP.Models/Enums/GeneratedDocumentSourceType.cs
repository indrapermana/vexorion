using System.Text.Json.Serialization;

namespace VexorionERP.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum GeneratedDocumentSourceType
{
    SalesOrder = 1,
    PurchaseOrder = 2,
    SalesInvoice = 3,
    PurchaseInvoice = 4,
    CustomerPaymentReceipt = 5,
    VendorPaymentReceipt = 6
}
