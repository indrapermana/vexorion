namespace VexorionERP.Services;

/// <summary>
/// Transaction checkpoints used by integration tests to prove that failures roll back every POS
/// side effect. The production implementation is intentionally inert.
/// </summary>
public interface IPosCheckoutTransactionObserver
{
    Task ReachedAsync(PosCheckoutTransactionCheckpoint checkpoint, CancellationToken cancellationToken);
}

public enum PosCheckoutTransactionCheckpoint
{
    OrderSaved,
    ShipmentSaved,
    InvoiceSaved,
    PaymentSaved,
    CheckoutRecordSaved,
    AuditSaved,
}

public sealed class NoOpPosCheckoutTransactionObserver : IPosCheckoutTransactionObserver
{
    public Task ReachedAsync(PosCheckoutTransactionCheckpoint checkpoint, CancellationToken cancellationToken)
        => Task.CompletedTask;
}
