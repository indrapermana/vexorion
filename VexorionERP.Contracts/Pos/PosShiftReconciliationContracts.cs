using System.ComponentModel.DataAnnotations;
using VexorionERP.Models;

namespace VexorionERP.Contracts;

public class CreatePosCashMovementRequest
{
    public PosCashMovementType Type { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [Required, StringLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public class PosCashMovementResponse
{
    public Guid Id { get; set; }
    public PosCashMovementType Type { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; }
}

public class PosShiftReconciliationResponse
{
    public Guid ShiftId { get; set; }
    public decimal OpeningFloat { get; set; }
    public decimal CashSales { get; set; }
    public decimal CashRefunds { get; set; }
    public decimal CardSales { get; set; }
    public decimal TransferSales { get; set; }
    public decimal CashIn { get; set; }
    public decimal CashOut { get; set; }
    public decimal ExpectedCash { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public List<PosCashMovementResponse> Movements { get; set; } = [];
}
