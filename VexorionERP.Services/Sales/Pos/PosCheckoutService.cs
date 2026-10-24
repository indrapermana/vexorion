using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP.Services;

public interface IPosCheckoutService
{
    Task<ServiceResult<PosCheckoutResponse>> CheckoutAsync(Guid cashierId, PosCheckoutRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Runs a whole POS sale (order, shipment, invoice, payment) in a single database transaction and
/// records an idempotency key so a retried or double-submitted checkout never duplicates documents.
/// </summary>
public class PosCheckoutService(
    AppDbContext dbContext,
    ICurrentTenantProvider currentTenantProvider,
    SalesShipmentCommandService shipmentService,
    SalesInvoiceCommandService invoiceService,
    CustomerPaymentCommandService paymentService,
    IAuditLogger auditLogger) : IPosCheckoutService
{
    private const string PaymentMethodFallback = "CASH";

    public async Task<ServiceResult<PosCheckoutResponse>> CheckoutAsync(Guid cashierId, PosCheckoutRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status400BadRequest, "Tenant context is required.");
        }

        var validation = ValidateRequest(request);
        if (validation.Count > 0)
        {
            return ServiceResult<PosCheckoutResponse>.ValidationFailure(validation);
        }

        var requestHash = ComputeHash(request);
        var replay = await TryReplayAsync(tenantId.Value, request.IdempotencyKey, requestHash, cancellationToken);
        if (replay is not null)
        {
            return replay;
        }

        try
        {
            return await ExecuteAsync(tenantId.Value, cashierId, request, requestHash, cancellationToken);
        }
        catch (DbUpdateException)
        {
            // A concurrent request with the same key committed first; return its result instead.
            dbContext.ChangeTracker.Clear();
            var concurrentReplay = await TryReplayAsync(tenantId.Value, request.IdempotencyKey, requestHash, cancellationToken);
            if (concurrentReplay is not null)
            {
                return concurrentReplay;
            }

            throw;
        }
    }

    private async Task<ServiceResult<PosCheckoutResponse>> ExecuteAsync(Guid tenantId, Guid cashierId, PosCheckoutRequest request, string requestHash, CancellationToken cancellationToken)
    {
        var shift = await dbContext.ShiftSessions.GetByTenant(tenantId)
            .FirstOrDefaultAsync(x => x.Id == request.ShiftId, cancellationToken);
        if (shift is null || shift.CashierId != cashierId)
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status404NotFound, "Shift not found.", "pos.shift_not_found");
        }

        if (shift.Status != ShiftStatus.Open)
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status409Conflict, "The shift is closed.", "pos.shift_closed");
        }

        if (!await dbContext.Customers.GetByTenant(tenantId).AnyAsync(x => x.Id == request.CustomerId, cancellationToken))
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status400BadRequest, "Customer not found.", "pos.customer_not_found");
        }

        if (!await dbContext.Warehouses.GetByTenant(tenantId).AnyAsync(x => x.Id == request.WarehouseId, cancellationToken))
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status400BadRequest, "Warehouse not found.", "pos.warehouse_not_found");
        }

        var productIds = request.Lines.Select(x => x.ProductId).Distinct().ToList();
        var knownProductCount = await dbContext.Products.GetByTenant(tenantId)
            .CountAsync(x => productIds.Contains(x.Id), cancellationToken);
        if (knownProductCount != productIds.Count)
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status400BadRequest, "One or more products were not found.", "pos.product_not_found");
        }

        var grandTotal = request.Lines.Sum(x => (x.Quantity * x.UnitPrice) - x.DiscountAmount);
        if (!request.IsDelivery && request.PaymentAmount < grandTotal)
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status400BadRequest, "Payment is lower than the amount due.", "pos.payment_insufficient");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var suffix = $"{today:yyyyMMdd}-{request.IdempotencyKey:N}"[..17];
        var currency = shift.CurrencyCode;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var order = new SalesOrder
        {
            TenantId = tenantId,
            OrderNumber = $"SO-POS-{suffix}".ToUpperInvariant(),
            CustomerId = request.CustomerId,
            WarehouseId = request.WarehouseId,
            OrderDate = today,
            RequiredDate = today,
            Status = DocumentStatus.Confirmed,
            CurrencyCode = currency,
            TotalAmount = grandTotal,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        foreach (var line in request.Lines)
        {
            order.Lines.Add(new SalesOrderLine
            {
                TenantId = tenantId,
                ProductId = line.ProductId,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                DiscountAmount = line.DiscountAmount,
            });
        }

        dbContext.SalesOrders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        var shipmentResult = await shipmentService.CreateAsync(new CreateSalesShipmentRequest
        {
            ShipmentNumber = $"SHP-POS-{suffix}",
            SalesOrderId = order.Id,
            WarehouseId = request.WarehouseId,
            ShipmentDate = today,
            Notes = request.IsDelivery ? "Delivery order from POS" : "Counter sale from POS",
            Lines = order.Lines.Select(x => new CreateSalesShipmentLineRequest
            {
                SalesOrderLineId = x.Id,
                ProductId = x.ProductId,
                ShippedQuantity = x.Quantity,
                UnitPrice = x.UnitPrice,
            }).ToList(),
        }, cancellationToken);
        if (!shipmentResult.Succeeded)
        {
            return await RollbackAsync(transaction, shipmentResult, cancellationToken);
        }

        var shipment = shipmentResult.Value!;
        if (!request.IsDelivery)
        {
            var postResult = await shipmentService.PostAsync(shipment.Id, cancellationToken);
            if (!postResult.Succeeded)
            {
                return await RollbackAsync(transaction, postResult, cancellationToken);
            }
        }

        var invoiceResult = await invoiceService.CreateAsync(new CreateSalesInvoiceRequest
        {
            InvoiceNumber = $"INV-POS-{suffix}",
            CustomerId = request.CustomerId,
            SourceSalesOrderId = order.Id,
            SourceSalesShipmentId = shipment.Id,
            InvoiceDate = today,
            DueDate = today,
            Status = InvoiceStatus.Issued,
            CurrencyCode = currency,
            Notes = order.Notes,
        }, cancellationToken);
        if (!invoiceResult.Succeeded)
        {
            return await RollbackAsync(transaction, invoiceResult, cancellationToken);
        }

        var invoice = invoiceResult.Value!;
        var applied = Math.Min(request.PaymentAmount, invoice.GrandTotal);
        Guid? paymentId = null;
        if (applied > 0m)
        {
            var paymentResult = await paymentService.CreateAsync(new CreateCustomerPaymentRequest
            {
                CustomerId = request.CustomerId,
                SalesInvoiceId = invoice.Id,
                PaymentDate = today,
                Amount = applied,
                CurrencyCode = currency,
                PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? PaymentMethodFallback : request.PaymentMethod.Trim(),
                Notes = "POS checkout payment",
            }, cancellationToken);
            if (!paymentResult.Succeeded)
            {
                return await RollbackAsync(transaction, paymentResult, cancellationToken);
            }

            paymentId = paymentResult.Value!.Id;
        }

        var response = new PosCheckoutResponse
        {
            SalesOrderId = order.Id,
            OrderNumber = order.OrderNumber,
            SalesShipmentId = shipment.Id,
            ShipmentNumber = shipment.ShipmentNumber,
            SalesInvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            CustomerPaymentId = paymentId,
            ShiftId = shift.Id,
            CurrencyCode = currency,
            GrandTotal = invoice.GrandTotal,
            AmountTendered = request.PaymentAmount,
            AmountApplied = applied,
            ChangeDue = Math.Max(0m, request.PaymentAmount - invoice.GrandTotal),
            CompletedAtUtc = DateTimeOffset.UtcNow,
        };

        dbContext.PosCheckoutRecords.Add(new PosCheckoutRecord
        {
            TenantId = tenantId,
            IdempotencyKey = request.IdempotencyKey,
            CashierId = cashierId,
            ShiftId = shift.Id,
            RequestHash = requestHash,
            SalesOrderId = order.Id,
            SalesShipmentId = shipment.Id,
            SalesInvoiceId = invoice.Id,
            CustomerPaymentId = paymentId,
            ResponseJson = JsonSerializer.Serialize(response),
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await auditLogger.LogAsync("pos.checkout_completed", tenantId, cashierId, cashierId, nameof(SalesInvoice), invoice.Id.ToString(),
            $"POS checkout {invoice.InvoiceNumber} completed.", cancellationToken: cancellationToken);

        return ServiceResult<PosCheckoutResponse>.Success(response);
    }

    private async Task<ServiceResult<PosCheckoutResponse>?> TryReplayAsync(Guid tenantId, Guid key, string requestHash, CancellationToken cancellationToken)
    {
        var record = await dbContext.PosCheckoutRecords.GetByTenant(tenantId).AsNoTracking()
            .FirstOrDefaultAsync(x => x.IdempotencyKey == key, cancellationToken);
        if (record is null)
        {
            return null;
        }

        if (!string.Equals(record.RequestHash, requestHash, StringComparison.Ordinal))
        {
            return ServiceResult<PosCheckoutResponse>.Failure(StatusCodes.Status409Conflict,
                "This checkout key was already used for a different sale.", "pos.idempotency_key_reused");
        }

        var response = JsonSerializer.Deserialize<PosCheckoutResponse>(record.ResponseJson)!;
        response.Replayed = true;
        return ServiceResult<PosCheckoutResponse>.Success(response);
    }

    private static async Task<ServiceResult<PosCheckoutResponse>> RollbackAsync<T>(
        IDbContextTransaction transaction,
        ServiceResult<T> failed,
        CancellationToken cancellationToken)
    {
        await transaction.RollbackAsync(cancellationToken);
        if (failed.Validation is not null)
        {
            return ServiceResult<PosCheckoutResponse>.ValidationFailure(failed.Validation.Errors.ToDictionary(x => x.Key, x => x.Value));
        }

        return ServiceResult<PosCheckoutResponse>.Failure(
            failed.StatusCode ?? StatusCodes.Status400BadRequest,
            failed.ErrorMessage ?? "Checkout could not be completed.",
            failed.ErrorCode);
    }

    private static Dictionary<string, string[]> ValidateRequest(PosCheckoutRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.IdempotencyKey == Guid.Empty)
            errors[nameof(request.IdempotencyKey)] = ["Idempotency key is required."];
        if (request.ShiftId == Guid.Empty)
            errors[nameof(request.ShiftId)] = ["Shift is required."];
        if (request.CustomerId == Guid.Empty)
            errors[nameof(request.CustomerId)] = ["Customer is required."];
        if (request.WarehouseId == Guid.Empty)
            errors[nameof(request.WarehouseId)] = ["Warehouse is required."];
        if (request.PaymentAmount < 0m)
            errors[nameof(request.PaymentAmount)] = ["Payment amount cannot be negative."];
        if (request.Lines is null || request.Lines.Count == 0)
        {
            errors[nameof(request.Lines)] = ["At least one line is required."];
        }
        else if (request.Lines.Any(x => x.ProductId == Guid.Empty || x.Quantity <= 0m || x.UnitPrice < 0m
                     || x.DiscountAmount < 0m || x.DiscountAmount > x.Quantity * x.UnitPrice))
        {
            errors[nameof(request.Lines)] = ["Each line needs a product, a positive quantity, a valid price and a discount not above the line total."];
        }

        return errors;
    }

    private static string ComputeHash(PosCheckoutRequest request)
    {
        var canonical = JsonSerializer.Serialize(new
        {
            request.ShiftId,
            request.CustomerId,
            request.WarehouseId,
            request.IsDelivery,
            Notes = request.Notes?.Trim(),
            PaymentMethod = request.PaymentMethod?.Trim(),
            request.PaymentAmount,
            Lines = request.Lines.Select(x => new { x.ProductId, x.Quantity, x.UnitPrice, x.DiscountAmount }),
        });
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }
}
