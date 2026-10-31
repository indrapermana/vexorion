using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using Xunit;

namespace VexorionERP.Services;

public class PosShiftServiceTests
{
    [Fact]
    public async Task Reconciliation_UsesServerPaymentsRefundsAndCashMovements()
    {
        var fixture = await CreateAsync();
        AddPayment(fixture, 100m, "Cash");
        AddPayment(fixture, 40m, "Card");
        AddPayment(fixture, 30m, "Transfer");
        fixture.Db.PosRefundRecords.Add(new PosRefundRecord
        {
            TenantId = fixture.TenantId, ShiftId = fixture.ShiftId, CashierId = fixture.CashierId,
            IdempotencyKey = Guid.NewGuid(), SalesInvoiceId = Guid.NewGuid(), CreditNoteId = Guid.NewGuid(),
            RequestHash = "hash", Reason = "return", TotalCreditAmount = 12m, RefundAmount = 12m,
            AppliedCreditAmount = 12m, PaymentMethod = "CASH", ResponseJson = "{}",
        });
        fixture.Db.PosCashMovements.AddRange(
            Movement(fixture, PosCashMovementType.CashIn, 20m),
            Movement(fixture, PosCashMovementType.CashOut, 5m));
        await fixture.Db.SaveChangesAsync();

        var result = await fixture.Service.GetReconciliationAsync(fixture.CashierId, fixture.ShiftId);

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(100m, result.Value!.CashSales);
        Assert.Equal(12m, result.Value.CashRefunds);
        Assert.Equal(40m, result.Value.CardSales);
        Assert.Equal(30m, result.Value.TransferSales);
        Assert.Equal(203m, result.Value.ExpectedCash); // 100 opening + 100 - 12 + 20 - 5
    }

    [Fact]
    public async Task Close_RejectsNonZeroVarianceWithoutReason_AndPersistsSnapshotWithReason()
    {
        var fixture = await CreateAsync();
        AddPayment(fixture, 50m, "Cash");
        await fixture.Db.SaveChangesAsync();

        var rejected = await fixture.Service.CloseAsync(fixture.CashierId, fixture.ShiftId, new CloseShiftRequest { CountedCash = 145m });
        Assert.False(rejected.Succeeded);
        Assert.Contains(nameof(CloseShiftRequest.VarianceReason), rejected.Validation!.Errors.Keys);

        var result = await fixture.Service.CloseAsync(fixture.CashierId, fixture.ShiftId, new CloseShiftRequest
        {
            CountedCash = 145m,
            VarianceReason = "Five dollars short after recount",
        });

        Assert.True(result.Succeeded, result.ErrorMessage);
        Assert.Equal(150m, result.Value!.ExpectedCash);
        Assert.Equal(-5m, result.Value.CashVariance);
        Assert.Equal("Five dollars short after recount", result.Value.VarianceReason);
        Assert.Equal(ShiftStatus.Closed, (await fixture.Db.ShiftSessions.FindAsync(fixture.ShiftId))!.Status);
    }

    [Fact]
    public async Task CashMovement_RequiresReasonAndRejectsAnotherCashiersShift()
    {
        var fixture = await CreateAsync();
        var invalid = await fixture.Service.AddCashMovementAsync(fixture.CashierId, fixture.ShiftId,
            new CreatePosCashMovementRequest { Type = PosCashMovementType.CashOut, Amount = 10m, Reason = " " });
        Assert.False(invalid.Succeeded);

        var forbidden = await fixture.Service.AddCashMovementAsync(Guid.NewGuid(), fixture.ShiftId,
            new CreatePosCashMovementRequest { Type = PosCashMovementType.CashOut, Amount = 10m, Reason = "Bank deposit" });
        Assert.False(forbidden.Succeeded);
        Assert.Equal(403, forbidden.StatusCode);
        Assert.Empty(fixture.Db.PosCashMovements);
    }

    private static async Task<Fixture> CreateAsync()
    {
        var tenantId = Guid.NewGuid();
        var cashierId = Guid.NewGuid();
        var shiftId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var provider = new FixedTenantProvider(tenantId);
        var db = new AppDbContext(options, provider);
        db.ShiftSessions.Add(new ShiftSession
        {
            Id = shiftId, TenantId = tenantId, CashierId = cashierId, CashierName = "Cashier",
            OpeningFloat = 100m, CurrencyCode = "USD", Status = ShiftStatus.Open,
        });
        await db.SaveChangesAsync();
        return new Fixture(tenantId, cashierId, shiftId, db, new PosShiftService(db, provider, new NoOpAuditLogger()));
    }

    private static void AddPayment(Fixture fixture, decimal amount, string method)
    {
        var paymentId = Guid.NewGuid();
        fixture.Db.CustomerPayments.Add(new CustomerPayment
        {
            Id = paymentId, TenantId = fixture.TenantId, CustomerId = Guid.NewGuid(), SalesInvoiceId = Guid.NewGuid(),
            PaymentDate = DateOnly.FromDateTime(DateTime.UtcNow), Amount = amount, CurrencyCode = "USD", PaymentMethod = method,
        });
        fixture.Db.PosCheckoutRecords.Add(new PosCheckoutRecord
        {
            TenantId = fixture.TenantId, ShiftId = fixture.ShiftId, CashierId = fixture.CashierId,
            IdempotencyKey = Guid.NewGuid(), RequestHash = "hash", SalesOrderId = Guid.NewGuid(),
            SalesShipmentId = Guid.NewGuid(), SalesInvoiceId = Guid.NewGuid(), CustomerPaymentId = paymentId, ResponseJson = "{}",
        });
    }

    private static PosCashMovement Movement(Fixture fixture, PosCashMovementType type, decimal amount) => new()
    {
        TenantId = fixture.TenantId, ShiftId = fixture.ShiftId, CashierId = fixture.CashierId,
        Type = type, Amount = amount, Reason = "Test movement",
    };

    private sealed record Fixture(Guid TenantId, Guid CashierId, Guid ShiftId, AppDbContext Db, PosShiftService Service);
}
