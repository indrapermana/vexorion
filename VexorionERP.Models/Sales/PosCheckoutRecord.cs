namespace VexorionERP.Models;

/// <summary>Idempotency record linking one POS checkout attempt to the documents it created.</summary>
public class PosCheckoutRecord : TenantEntityBase
{
    public Guid IdempotencyKey { get; set; }
    public Guid CashierId { get; set; }
    public Guid ShiftId { get; set; }

    /// <summary>SHA-256 of the normalised request, used to reject key reuse with a different payload.</summary>
    public string RequestHash { get; set; } = string.Empty;

    public Guid SalesOrderId { get; set; }
    public Guid SalesShipmentId { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public Guid? CustomerPaymentId { get; set; }

    /// <summary>Serialized PosCheckoutResponse returned on replay.</summary>
    public string ResponseJson { get; set; } = string.Empty;
}
