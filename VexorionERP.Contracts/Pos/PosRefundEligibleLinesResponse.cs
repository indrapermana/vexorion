namespace VexorionERP.Contracts;

public class PosRefundEligibleLinesResponse
{
    public Guid SalesInvoiceId { get; set; }
    public List<PosRefundEligibleLineResponse> Lines { get; set; } = [];
}

public class PosRefundEligibleLineResponse
{
    public Guid SalesInvoiceLineId { get; set; }
    public decimal QuantitySold { get; set; }
    public decimal QuantityReturned { get; set; }
    public decimal QuantityRemaining { get; set; }
    public bool CanReturnToStock { get; set; }
}