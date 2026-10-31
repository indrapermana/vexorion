using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface IPosShiftService
{
    Task<ServiceResult<PosShiftReconciliationResponse>> GetReconciliationAsync(Guid cashierId, Guid shiftId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PosCashMovementResponse>> AddCashMovementAsync(Guid cashierId, Guid shiftId, CreatePosCashMovementRequest request, CancellationToken cancellationToken = default);
    Task<ServiceResult<ShiftSessionResponse>> CloseAsync(Guid cashierId, Guid shiftId, CloseShiftRequest request, CancellationToken cancellationToken = default);
}

public class PosShiftService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger) : IPosShiftService
{
    public async Task<ServiceResult<PosShiftReconciliationResponse>> GetReconciliationAsync(
        Guid cashierId, Guid shiftId, CancellationToken cancellationToken = default)
    {
        var context = await GetOpenOwnedShiftAsync(cashierId, shiftId, cancellationToken);
        if (!context.Succeeded)
            return ServiceResult<PosShiftReconciliationResponse>.Failure(context.StatusCode ?? StatusCodes.Status400BadRequest, context.ErrorMessage!, context.ErrorCode);

        return ServiceResult<PosShiftReconciliationResponse>.Success(
            await CalculateAsync(context.Value!, cancellationToken));
    }

    public async Task<ServiceResult<PosCashMovementResponse>> AddCashMovementAsync(
        Guid cashierId, Guid shiftId, CreatePosCashMovementRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(request.Type) || request.Amount <= 0m || string.IsNullOrWhiteSpace(request.Reason))
        {
            return ServiceResult<PosCashMovementResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request)] = ["Movement type, a positive amount, and a reason are required."],
            });
        }

        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<PosCashMovementResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        if (string.Equals(dbContext.Database.ProviderName, "Npgsql.EntityFrameworkCore.PostgreSQL", StringComparison.Ordinal))
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"ShiftSession\" WHERE \"Id\" = {shiftId} AND \"TenantId\" = {tenantId.Value} FOR UPDATE",
                cancellationToken);
        }

        var context = await GetOpenOwnedShiftAsync(cashierId, shiftId, cancellationToken);
        if (!context.Succeeded)
            return ServiceResult<PosCashMovementResponse>.Failure(context.StatusCode ?? StatusCodes.Status400BadRequest, context.ErrorMessage!, context.ErrorCode);

        var shift = context.Value!;
        var movement = new PosCashMovement
        {
            TenantId = shift.TenantId,
            ShiftId = shift.Id,
            CashierId = cashierId,
            Type = request.Type,
            Amount = decimal.Round(request.Amount, 2),
            Reason = request.Reason.Trim(),
            OccurredAtUtc = DateTime.UtcNow,
        };

        dbContext.PosCashMovements.Add(movement);
        await dbContext.SaveChangesAsync(cancellationToken);
        await auditLogger.LogAsync(
            "pos.shift_cash_movement", shift.TenantId, cashierId, cashierId,
            nameof(PosCashMovement), movement.Id.ToString(),
            $"{movement.Type} recorded for POS shift.",
            new { movement.ShiftId, movement.Type, movement.Amount, movement.Reason }, cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<PosCashMovementResponse>.Success(ToResponse(movement));
    }

    public async Task<ServiceResult<ShiftSessionResponse>> CloseAsync(
        Guid cashierId, Guid shiftId, CloseShiftRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<ShiftSessionResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        if (string.Equals(dbContext.Database.ProviderName, "Npgsql.EntityFrameworkCore.PostgreSQL", StringComparison.Ordinal))
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"ShiftSession\" WHERE \"Id\" = {shiftId} AND \"TenantId\" = {tenantId.Value} FOR UPDATE",
                cancellationToken);
        }

        var shift = await dbContext.ShiftSessions.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == shiftId, cancellationToken);
        if (shift is null)
            return ServiceResult<ShiftSessionResponse>.Failure(StatusCodes.Status404NotFound, "Shift not found.", "pos.shift_not_found");
        if (shift.CashierId != cashierId)
            return ServiceResult<ShiftSessionResponse>.Failure(StatusCodes.Status403Forbidden, "Only the cashier who opened the shift can close it.", "pos.shift_not_owned");
        if (shift.Status == ShiftStatus.Closed)
            return ServiceResult<ShiftSessionResponse>.Failure(StatusCodes.Status409Conflict, "Shift is already closed.", "pos.shift_already_closed");

        var reconciliation = await CalculateAsync(shift, cancellationToken);
        var variance = decimal.Round(request.CountedCash - reconciliation.ExpectedCash, 2);
        if (variance != 0m && string.IsNullOrWhiteSpace(request.VarianceReason))
        {
            return ServiceResult<ShiftSessionResponse>.ValidationFailure(new Dictionary<string, string[]>
            {
                [nameof(request.VarianceReason)] = ["A reason is required when counted cash differs from expected cash."],
            });
        }

        shift.Status = ShiftStatus.Closed;
        shift.ClosedAtUtc = DateTime.UtcNow;
        shift.CountedCash = request.CountedCash;
        shift.CashSales = reconciliation.CashSales;
        shift.CashRefunds = reconciliation.CashRefunds;
        shift.CardSales = reconciliation.CardSales;
        shift.TransferSales = reconciliation.TransferSales;
        shift.CashIn = reconciliation.CashIn;
        shift.CashOut = reconciliation.CashOut;
        shift.ExpectedCash = reconciliation.ExpectedCash;
        shift.CashVariance = variance;
        shift.VarianceReason = string.IsNullOrWhiteSpace(request.VarianceReason) ? null : request.VarianceReason.Trim();
        shift.Notes = string.IsNullOrWhiteSpace(request.Notes) ? shift.Notes : request.Notes.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditLogger.LogAsync(
            "pos.shift_closed", shift.TenantId, cashierId, cashierId, nameof(ShiftSession), shift.Id.ToString(),
            "POS shift closed with server-calculated cash reconciliation.",
            new { shift.CountedCash, shift.ExpectedCash, shift.CashVariance, shift.VarianceReason, shift.CashSales, shift.CashRefunds, shift.CardSales, shift.TransferSales, shift.CashIn, shift.CashOut },
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<ShiftSessionResponse>.Success(ToResponse(shift));
    }

    private async Task<ServiceResult<ShiftSession>> GetOpenOwnedShiftAsync(Guid cashierId, Guid shiftId, CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<ShiftSession>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var shift = await dbContext.ShiftSessions.GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == shiftId, cancellationToken);
        if (shift is null)
            return ServiceResult<ShiftSession>.Failure(StatusCodes.Status404NotFound, "Shift not found.", "pos.shift_not_found");
        if (shift.CashierId != cashierId)
            return ServiceResult<ShiftSession>.Failure(StatusCodes.Status403Forbidden, "This shift belongs to another cashier.", "pos.shift_not_owned");
        if (shift.Status != ShiftStatus.Open)
            return ServiceResult<ShiftSession>.Failure(StatusCodes.Status409Conflict, "The shift is closed.", "pos.shift_closed");
        return ServiceResult<ShiftSession>.Success(shift);
    }

    private async Task<PosShiftReconciliationResponse> CalculateAsync(ShiftSession shift, CancellationToken cancellationToken)
    {
        var payments = await (
            from checkout in dbContext.PosCheckoutRecords.GetByTenant(shift.TenantId).AsNoTracking()
            join payment in dbContext.CustomerPayments.GetByTenant(shift.TenantId).AsNoTracking()
                on checkout.CustomerPaymentId equals payment.Id
            where checkout.ShiftId == shift.Id && payment.Amount > 0m
            select new { payment.Amount, payment.PaymentMethod })
            .ToListAsync(cancellationToken);

        decimal SumPayments(string method) => payments
            .Where(x => string.Equals(x.PaymentMethod?.Trim(), method, StringComparison.OrdinalIgnoreCase))
            .Sum(x => x.Amount);

        var movements = await dbContext.PosCashMovements.GetByTenant(shift.TenantId).AsNoTracking()
            .Where(x => x.ShiftId == shift.Id)
            .OrderBy(x => x.OccurredAtUtc)
            .ToListAsync(cancellationToken);
        var cashRefunds = await dbContext.PosRefundRecords.GetByTenant(shift.TenantId).AsNoTracking()
            .Where(x => x.ShiftId == shift.Id && x.RefundAmount > 0m && x.PaymentMethod != null && x.PaymentMethod.ToUpper() == "CASH")
            .SumAsync(x => x.RefundAmount, cancellationToken);
        var cashSales = SumPayments("Cash");
        var cashIn = movements.Where(x => x.Type == PosCashMovementType.CashIn).Sum(x => x.Amount);
        var cashOut = movements.Where(x => x.Type == PosCashMovementType.CashOut).Sum(x => x.Amount);

        return new PosShiftReconciliationResponse
        {
            ShiftId = shift.Id,
            OpeningFloat = shift.OpeningFloat,
            CashSales = cashSales,
            CashRefunds = cashRefunds,
            CardSales = SumPayments("Card"),
            TransferSales = SumPayments("Transfer"),
            CashIn = cashIn,
            CashOut = cashOut,
            ExpectedCash = decimal.Round(shift.OpeningFloat + cashSales - cashRefunds + cashIn - cashOut, 2),
            CurrencyCode = shift.CurrencyCode,
            Movements = movements.Select(ToResponse).ToList(),
        };
    }

    private static PosCashMovementResponse ToResponse(PosCashMovement movement) => new()
    {
        Id = movement.Id, Type = movement.Type, Amount = movement.Amount,
        Reason = movement.Reason, OccurredAtUtc = movement.OccurredAtUtc,
    };

    private static ShiftSessionResponse ToResponse(ShiftSession shift) => new()
    {
        Id = shift.Id, TenantId = shift.TenantId, CashierId = shift.CashierId, CashierName = shift.CashierName,
        OpenedAtUtc = shift.OpenedAtUtc, ClosedAtUtc = shift.ClosedAtUtc, OpeningFloat = shift.OpeningFloat,
        CountedCash = shift.CountedCash, CashSales = shift.CashSales, CashRefunds = shift.CashRefunds,
        CardSales = shift.CardSales, TransferSales = shift.TransferSales, CashIn = shift.CashIn, CashOut = shift.CashOut,
        ExpectedCash = shift.ExpectedCash, CashVariance = shift.CashVariance, VarianceReason = shift.VarianceReason,
        CurrencyCode = shift.CurrencyCode, Status = shift.Status, Notes = shift.Notes,
    };
}
