using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface IPosRefundService
{
    Task<ServiceResult<PosRefundEligibleLinesResponse>> GetEligibleLinesAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default);
    Task<ServiceResult<PosRefundResponse>> RefundAsync(Guid cashierId, PosRefundRequest request, CancellationToken cancellationToken = default);
}

public class PosRefundService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    IAuditLogger auditLogger) : IPosRefundService
{
    public async Task<ServiceResult<PosRefundEligibleLinesResponse>> GetEligibleLinesAsync(Guid salesInvoiceId, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ServiceResult<PosRefundEligibleLinesResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var invoice = await dbContext.SalesInvoices.GetByTenant(tenantId.Value)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == salesInvoiceId, cancellationToken);
        if (invoice is null)
            return ServiceResult<PosRefundEligibleLinesResponse>.Failure(StatusCodes.Status404NotFound, "Sales invoice not found.", "pos.refund.invoice_not_found");

        var checkout = await dbContext.PosCheckoutRecords.GetByTenant(tenantId.Value).AsNoTracking()
            .FirstOrDefaultAsync(x => x.SalesInvoiceId == invoice.Id, cancellationToken);
        if (checkout is null)
            return ServiceResult<PosRefundEligibleLinesResponse>.Failure(StatusCodes.Status409Conflict, "This invoice is not linked to a POS sale.", "pos.refund.not_pos_sale");

        var shipment = await dbContext.SalesShipments.GetByTenant(tenantId.Value).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == checkout.SalesShipmentId, cancellationToken);
        if (shipment is null)
            return ServiceResult<PosRefundEligibleLinesResponse>.Failure(StatusCodes.Status409Conflict, "The original shipment could not be found.", "pos.refund.shipment_not_found");

        var lineIds = invoice.Lines.Select(x => x.Id).ToArray();
        var returns = await dbContext.PosRefundLines.GetByTenant(tenantId.Value)
            .Where(x => lineIds.Contains(x.SalesInvoiceLineId))
            .ToListAsync(cancellationToken);
        var returnedQuantities = returns.GroupBy(x => x.SalesInvoiceLineId)
            .ToDictionary(group => group.Key, group => group.Sum(x => x.Quantity));

        return ServiceResult<PosRefundEligibleLinesResponse>.Success(new PosRefundEligibleLinesResponse
        {
            SalesInvoiceId = invoice.Id,
            Lines = invoice.Lines.Where(x => x.IsActive && x.Quantity > 0m).Select(line =>
            {
                var returned = returnedQuantities.GetValueOrDefault(line.Id);
                return new PosRefundEligibleLineResponse
                {
                    SalesInvoiceLineId = line.Id,
                    QuantitySold = line.Quantity,
                    QuantityReturned = returned,
                    QuantityRemaining = shipment.Status == DocumentStatus.Completed
                        ? Math.Max(0m, line.Quantity - returned)
                        : 0m,
                    CanReturnToStock = shipment.Status == DocumentStatus.Completed,
                };
            }).ToList(),
        });
    }

    public async Task<ServiceResult<PosRefundResponse>> RefundAsync(Guid cashierId, PosRefundRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return Failure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var validation = Validate(request);
        if (validation.Count > 0)
            return ServiceResult<PosRefundResponse>.ValidationFailure(validation);

        var requestHash = ComputeHash(request);
        var replay = await TryReplayAsync(tenantId.Value, request.IdempotencyKey, requestHash, cancellationToken);
        if (replay is not null)
            return replay;

        try
        {
            return await ExecuteAsync(tenantId.Value, cashierId, request, requestHash, cancellationToken);
        }
        catch (DbUpdateException)
        {
            dbContext.ChangeTracker.Clear();
            var concurrentReplay = await TryReplayAsync(tenantId.Value, request.IdempotencyKey, requestHash, cancellationToken);
            if (concurrentReplay is not null)
                return concurrentReplay;
            throw;
        }
    }

    private async Task<ServiceResult<PosRefundResponse>> ExecuteAsync(
        Guid tenantId,
        Guid cashierId,
        PosRefundRequest request,
        string requestHash,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        if (string.Equals(dbContext.Database.ProviderName, "Npgsql.EntityFrameworkCore.PostgreSQL", StringComparison.Ordinal))
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"ShiftSession\" WHERE \"Id\" = {request.ShiftId} AND \"TenantId\" = {tenantId} FOR UPDATE",
                cancellationToken);
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"SalesInvoice\" WHERE \"Id\" = {request.SalesInvoiceId} AND \"TenantId\" = {tenantId} FOR UPDATE",
                cancellationToken);
        }

        var replay = await TryReplayAsync(tenantId, request.IdempotencyKey, requestHash, cancellationToken);
        if (replay is not null)
            return replay;

        var shift = await dbContext.ShiftSessions.GetByTenant(tenantId)
            .FirstOrDefaultAsync(x => x.Id == request.ShiftId, cancellationToken);
        if (shift is null || shift.CashierId != cashierId)
            return Failure(StatusCodes.Status404NotFound, "Shift not found.", "pos.shift_not_found");
        if (shift.Status != ShiftStatus.Open)
            return Failure(StatusCodes.Status409Conflict, "The shift is closed.", "pos.shift_closed");

        var invoice = await dbContext.SalesInvoices.GetByTenant(tenantId)
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == request.SalesInvoiceId, cancellationToken);
        if (invoice is null)
            return Failure(StatusCodes.Status404NotFound, "Sales invoice not found.", "pos.refund.invoice_not_found");
        if (invoice.Status is InvoiceStatus.Draft or InvoiceStatus.Cancelled || invoice.ReversedAtUtc.HasValue || invoice.CreditNoteOfInvoiceId.HasValue)
            return Failure(StatusCodes.Status409Conflict, "Only an active POS sale can be returned.", "pos.refund.invoice_not_returnable");
        if (!string.Equals(invoice.CurrencyCode, shift.CurrencyCode, StringComparison.OrdinalIgnoreCase))
            return Failure(StatusCodes.Status409Conflict, "The refund shift currency does not match the original sale.", "pos.refund.currency_mismatch");

        var checkout = await dbContext.PosCheckoutRecords.GetByTenant(tenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SalesInvoiceId == invoice.Id, cancellationToken);
        if (checkout is null)
            return Failure(StatusCodes.Status409Conflict, "This invoice is not linked to a POS sale.", "pos.refund.not_pos_sale");

        var unrelatedCreditNote = await dbContext.SalesInvoices.GetByTenant(tenantId)
            .AnyAsync(x => x.CreditNoteOfInvoiceId == invoice.Id &&
                !dbContext.PosRefundRecords.GetByTenant(tenantId).Any(refund => refund.CreditNoteId == x.Id), cancellationToken);
        if (unrelatedCreditNote)
            return Failure(StatusCodes.Status409Conflict, "This sale already has a credit note outside the POS return workflow.", "pos.refund.existing_credit_note");

        var shipment = await dbContext.SalesShipments.GetByTenant(tenantId)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == checkout.SalesShipmentId, cancellationToken);
        if (shipment is null)
            return Failure(StatusCodes.Status409Conflict, "The original shipment could not be found.", "pos.refund.shipment_not_found");
        if (shipment.Status != DocumentStatus.Completed)
            return Failure(StatusCodes.Status409Conflict, "Items can only be returned after the original shipment was posted.", "pos.refund.not_fulfilled");

        var requestedIds = request.Lines.Select(x => x.SalesInvoiceLineId).ToArray();
        var invoiceLines = invoice.Lines.Where(x => requestedIds.Contains(x.Id) && x.IsActive).ToDictionary(x => x.Id);
        if (invoiceLines.Count != requestedIds.Length)
            return Failure(StatusCodes.Status400BadRequest, "One or more returned lines do not belong to this invoice.", "pos.refund.invalid_lines");

        var previousReturns = await dbContext.PosRefundLines.GetByTenant(tenantId)
            .Where(x => requestedIds.Contains(x.SalesInvoiceLineId))
            .ToListAsync(cancellationToken);
        var existingQuantities = previousReturns.GroupBy(x => x.SalesInvoiceLineId)
            .ToDictionary(group => group.Key, group => group.Sum(x => x.Quantity));

        var creditLines = new List<(SalesInvoiceLine Original, PosRefundLineRequest Request, decimal Discount, decimal Tax, decimal Total)>();
        foreach (var requestedLine in request.Lines)
        {
            var originalLine = invoiceLines[requestedLine.SalesInvoiceLineId];
            var alreadyReturned = existingQuantities.GetValueOrDefault(originalLine.Id);
            if (requestedLine.Quantity > originalLine.Quantity - alreadyReturned)
                return Failure(StatusCodes.Status409Conflict, "The return quantity exceeds the quantity still eligible for return.", "pos.refund.quantity_exceeded");
            var discount = RoundMoney(originalLine.DiscountAmount * requestedLine.Quantity / originalLine.Quantity);
            var tax = RoundMoney(originalLine.TaxAmount * requestedLine.Quantity / originalLine.Quantity);
            var subtotal = RoundMoney(originalLine.UnitPrice * requestedLine.Quantity - discount);
            var total = subtotal + tax;
            if (total <= 0m)
                return Failure(StatusCodes.Status400BadRequest, "Returned lines must have a positive credited value.", "pos.refund.invalid_line_amount");
            creditLines.Add((originalLine, requestedLine, discount, tax, total));
        }

        var totalCredit = RoundMoney(creditLines.Sum(x => x.Total));
        var remainingFaceValue = invoice.GrandTotal - invoice.AppliedCreditTotal;
        var paidRatio = remainingFaceValue > 0m
            ? Math.Clamp(invoice.PaidTotal / remainingFaceValue, 0m, 1m)
            : 0m;
        var refundAmount = Math.Min(totalCredit, RoundMoney(totalCredit * paidRatio));
        var appliedCreditAmount = totalCredit;
        var paymentMethod = refundAmount > 0m
            ? await dbContext.CustomerPayments.GetByTenant(tenantId)
                .Where(x => x.Id == checkout.CustomerPaymentId && x.Amount > 0m)
                .Select(x => x.PaymentMethod)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var refundId = Guid.NewGuid();
        var creditNoteId = Guid.NewGuid();
        var refundPaymentId = refundAmount > 0m ? Guid.NewGuid() : (Guid?)null;
        var creditNoteNumber = $"CR-POS-{request.IdempotencyKey:N}";
        var subtotalTotal = RoundMoney(creditLines.Sum(x => x.Original.UnitPrice * x.Request.Quantity - x.Discount));
        var taxTotal = RoundMoney(creditLines.Sum(x => x.Tax));
        var creditNote = new SalesInvoice
        {
            Id = creditNoteId,
            TenantId = tenantId,
            InvoiceNumber = creditNoteNumber,
            CustomerId = invoice.CustomerId,
            SourceSalesOrderId = invoice.SourceSalesOrderId,
            SourceSalesShipmentId = invoice.SourceSalesShipmentId,
            InvoiceDate = today,
            DueDate = today,
            CurrencyCode = invoice.CurrencyCode,
            Subtotal = -subtotalTotal,
            TaxTotal = -taxTotal,
            GrandTotal = -totalCredit,
            CreditNoteOfInvoiceId = invoice.Id,
            Status = InvoiceStatus.Issued,
            Notes = $"POS return for {invoice.InvoiceNumber}: {request.Reason.Trim()}",
            Lines = creditLines.Select(x => new SalesInvoiceLine
            {
                TenantId = tenantId,
                ProductId = x.Original.ProductId,
                TaxCodeId = x.Original.TaxCodeId,
                Quantity = x.Request.Quantity,
                UnitPrice = x.Original.UnitPrice,
                DiscountAmount = x.Discount,
                TaxAmount = x.Tax,
            }).ToList(),
        };

        invoice.AppliedCreditTotal += appliedCreditAmount;
        invoice.PaidTotal -= refundAmount;
        invoice.Status = invoice.BalanceDue <= 0m
            ? InvoiceStatus.Paid
            : invoice.PaidTotal > 0m || invoice.AppliedCreditTotal > 0m
                ? InvoiceStatus.PartiallyPaid
                : InvoiceStatus.Issued;

        CustomerPayment? refundPayment = null;
        if (refundPaymentId.HasValue)
        {
            refundPayment = new CustomerPayment
            {
                Id = refundPaymentId.Value,
                TenantId = tenantId,
                CustomerId = invoice.CustomerId,
                SalesInvoiceId = invoice.Id,
                PaymentDate = today,
                Amount = -refundAmount,
                CurrencyCode = invoice.CurrencyCode,
                PaymentMethod = paymentMethod,
                ReferenceNumber = creditNoteNumber,
                Notes = $"POS refund for {invoice.InvoiceNumber}",
            };
        }

        var response = new PosRefundResponse
        {
            RefundId = refundId,
            SalesInvoiceId = invoice.Id,
            CreditNoteId = creditNoteId,
            RefundPaymentId = refundPaymentId,
            CreditNoteNumber = creditNoteNumber,
            CurrencyCode = invoice.CurrencyCode,
            TotalCreditAmount = totalCredit,
            RefundAmount = refundAmount,
            AppliedCreditAmount = appliedCreditAmount,
            PaymentMethod = paymentMethod,
            CompletedAtUtc = now,
            Lines = creditLines.Select(x => new PosRefundLineResponse
            {
                SalesInvoiceLineId = x.Original.Id,
                ProductId = x.Original.ProductId,
                Quantity = x.Request.Quantity,
                ReturnedToStock = x.Request.ReturnToStock,
            }).ToList(),
        };

        var refundRecord = new PosRefundRecord
        {
            Id = refundId,
            TenantId = tenantId,
            IdempotencyKey = request.IdempotencyKey,
            CashierId = cashierId,
            ShiftId = shift.Id,
            SalesInvoiceId = invoice.Id,
            CreditNoteId = creditNoteId,
            RefundPaymentId = refundPaymentId,
            RequestHash = requestHash,
            Reason = request.Reason.Trim(),
            TotalCreditAmount = totalCredit,
            RefundAmount = refundAmount,
            AppliedCreditAmount = appliedCreditAmount,
            PaymentMethod = paymentMethod,
            CompletedAtUtc = now,
            ResponseJson = JsonSerializer.Serialize(response),
            Lines = creditLines.Select(x => new PosRefundLine
            {
                TenantId = tenantId,
                SalesInvoiceLineId = x.Original.Id,
                ProductId = x.Original.ProductId,
                Quantity = x.Request.Quantity,
                ReturnToStock = x.Request.ReturnToStock,
            }).ToList(),
        };

        dbContext.SalesInvoices.Add(creditNote);
        if (refundPayment is not null)
            dbContext.CustomerPayments.Add(refundPayment);
        dbContext.PosRefundRecords.Add(refundRecord);

        foreach (var line in creditLines.Where(x => x.Request.ReturnToStock))
        {
            var balance = await dbContext.InventoryBalances.GetByTenant(tenantId)
                .FirstOrDefaultAsync(x => x.ProductId == line.Original.ProductId && x.WarehouseId == shipment.WarehouseId, cancellationToken);
            if (balance is null)
            {
                balance = new InventoryBalance
                {
                    TenantId = tenantId,
                    ProductId = line.Original.ProductId,
                    WarehouseId = shipment.WarehouseId,
                    QuantityOnHand = line.Request.Quantity,
                };
                dbContext.InventoryBalances.Add(balance);
            }
            else
            {
                balance.QuantityOnHand += line.Request.Quantity;
            }

            dbContext.InventoryMovements.Add(new InventoryMovement
            {
                TenantId = tenantId,
                ProductId = line.Original.ProductId,
                WarehouseId = shipment.WarehouseId,
                MovementType = InventoryMovementType.PosCustomerReturn,
                Quantity = line.Request.Quantity,
                QuantityOnHandDelta = line.Request.Quantity,
                ReferenceNumber = creditNoteNumber,
                PosRefundRecordId = refundId,
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditLogger.LogAsync(
            "pos.refund_completed",
            tenantId,
            cashierId,
            cashierId,
            nameof(SalesInvoice),
            creditNoteId.ToString(),
            $"POS refund {creditNoteNumber} completed for {invoice.InvoiceNumber}.",
            new { request.IdempotencyKey, refundId, invoice.Id, totalCredit, refundAmount, paymentMethod },
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<PosRefundResponse>.Success(response);
    }

    private async Task<ServiceResult<PosRefundResponse>?> TryReplayAsync(Guid tenantId, Guid key, string requestHash, CancellationToken cancellationToken)
    {
        var record = await dbContext.PosRefundRecords.GetByTenant(tenantId).AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdempotencyKey == key, cancellationToken);
        if (record is null)
            return null;
        if (!string.Equals(record.RequestHash, requestHash, StringComparison.Ordinal))
            return Failure(StatusCodes.Status409Conflict, "This refund key was already used for a different return.", "pos.refund.idempotency_key_reused");

        var response = JsonSerializer.Deserialize<PosRefundResponse>(record.ResponseJson)!;
        response.Replayed = true;
        return ServiceResult<PosRefundResponse>.Success(response);
    }

    private static Dictionary<string, string[]> Validate(PosRefundRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.IdempotencyKey == Guid.Empty)
            errors[nameof(request.IdempotencyKey)] = ["A refund idempotency key is required."];
        if (request.ShiftId == Guid.Empty)
            errors[nameof(request.ShiftId)] = ["An open shift is required."];
        if (request.SalesInvoiceId == Guid.Empty)
            errors[nameof(request.SalesInvoiceId)] = ["An original sales invoice is required."];
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1000)
            errors[nameof(request.Reason)] = ["A return reason is required and must be at most 1000 characters."];
        if (request.Lines.Count == 0 || request.Lines.Any(x => x.SalesInvoiceLineId == Guid.Empty || x.Quantity <= 0m))
            errors[nameof(request.Lines)] = ["At least one return line with a positive quantity is required."];
        else if (request.Lines.Select(x => x.SalesInvoiceLineId).Distinct().Count() != request.Lines.Count)
            errors[nameof(request.Lines)] = ["Each invoice line may appear only once in a return."];
        return errors;
    }

    private static string ComputeHash(PosRefundRequest request)
    {
        var normalized = new
        {
            request.SalesInvoiceId,
            request.ShiftId,
            Reason = request.Reason.Trim(),
            Lines = request.Lines.OrderBy(x => x.SalesInvoiceLineId)
                .Select(x => new { x.SalesInvoiceLineId, x.Quantity, x.ReturnToStock }),
        };
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(normalized))));
    }

    private static decimal RoundMoney(decimal amount) => decimal.Round(amount, 2, MidpointRounding.AwayFromZero);

    private static ServiceResult<PosRefundResponse> Failure(int statusCode, string message, string code)
        => ServiceResult<PosRefundResponse>.Failure(statusCode, message, code);
}
