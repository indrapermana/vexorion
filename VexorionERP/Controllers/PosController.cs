using Mapster;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/pos")]
[Authorize]
public class PosController(AppDbContext dbContext, ICurrentTenantProvider currentTenantProvider) : ServiceResultControllerBase
{
    /// <summary>
    /// Returns the POS capability flags for the currently authenticated user based on their permission claims.
    /// The POS frontend calls this to know which actions (checkout, refund, reprint, shift close) to enable.
    /// </summary>
    [HttpGet("session")]
    public ActionResult<PosSessionResponse> GetSession()
    {
        var permissions = User.Claims
            .Where(c => c.Type == AppClaimTypes.Permission)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return Ok(new PosSessionResponse
        {
            CanCheckout = permissions.Contains(AppPermissions.Pos.Checkout),
            CanRefund = permissions.Contains(AppPermissions.Pos.Refund),
            CanReprint = permissions.Contains(AppPermissions.Pos.Reprint),
            CanCloseShift = permissions.Contains(AppPermissions.Pos.ShiftClose),
        });
    }

    /// <summary>
    /// Validates that all cart lines have sufficient on-hand stock before checkout begins.
    /// Call this before creating any sales documents so failures are fast and clean.
    /// </summary>
    [HttpPost("validate-stock")]
    [Authorize(Policy = AppPermissions.Pos.Checkout)]
    public async Task<ActionResult<PosStockValidationResponse>> ValidateStock(
        [FromBody] PosStockValidationRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
        {
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");
        }

        var response = new PosStockValidationResponse { IsValid = true };

        foreach (var line in request.Lines)
        {
            var balance = await dbContext.InventoryBalances
                .GetByTenant(tenantId.Value)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductId == line.ProductId && x.WarehouseId == line.WarehouseId, cancellationToken);

            var available = balance?.QuantityAvailable ?? 0m;
            if (available < line.Quantity)
            {
                response.IsValid = false;
                response.InsufficientItems.Add(new PosStockInsufficientItem
                {
                    ProductId = line.ProductId,
                    Available = available,
                    Requested = line.Quantity,
                });
            }
        }

        return Ok(response);
    }

    /// <summary>
    /// Completes a POS sale atomically: order, shipment, invoice and payment are created in one transaction.
    /// Safe to retry with the same idempotency key; a completed sale is replayed instead of duplicated.
    /// </summary>
    [HttpPost("checkout")]
    [Authorize(Policy = AppPermissions.Pos.Checkout)]
    public async Task<ActionResult<PosCheckoutResponse>> Checkout(
        [FromBody] PosCheckoutRequest request,
        [FromServices] IPosCheckoutService checkoutService,
        CancellationToken cancellationToken)
    {
        var cashierId = GetCurrentUserId();
        if (!cashierId.HasValue)
            return Unauthorized();

        var result = await checkoutService.CheckoutAsync(cashierId.Value, request, cancellationToken);
        return ToActionResult(result);
    }

    /// <summary>
    /// Opens a new shift for the currently authenticated cashier.
    /// Returns 409 Conflict if the cashier already has an open shift.
    /// </summary>
    [HttpPost("shifts/open")]
    [Authorize(Policy = AppPermissions.Pos.Checkout)]
    public async Task<ActionResult<ShiftSessionResponse>> OpenShift(
        [FromBody] OpenShiftRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var cashierId = GetCurrentUserId();
        if (!cashierId.HasValue)
            return Unauthorized();

        var existingOpen = await dbContext.ShiftSessions
            .GetByTenant(tenantId.Value)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.CashierId == cashierId.Value && x.Status == ShiftStatus.Open, cancellationToken);

        if (existingOpen is not null)
            return ApiFailure(StatusCodes.Status409Conflict, "Cashier already has an open shift.", "pos.shift_already_open");

        var cashierUser = await dbContext.Users.FindAsync([cashierId.Value], cancellationToken);
        var cashierName = cashierUser is null
            ? string.Empty
            : $"{cashierUser.FirstName} {cashierUser.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(cashierName))
            cashierName = cashierUser?.UserName ?? string.Empty;

        var shift = new ShiftSession
        {
            TenantId = tenantId.Value,
            CashierId = cashierId.Value,
            CashierName = cashierName,
            OpeningFloat = request.OpeningFloat,
            CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = ShiftStatus.Open,
            OpenedAtUtc = DateTime.UtcNow,
        };

        dbContext.ShiftSessions.Add(shift);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(shift.Adapt<ShiftSessionResponse>());
    }

    /// <summary>
    /// Closes the currently open shift for the authenticated cashier.
    /// </summary>
    [HttpPost("shifts/{shiftId:guid}/close")]
    [Authorize(Policy = AppPermissions.Pos.ShiftClose)]
    public async Task<ActionResult<ShiftSessionResponse>> CloseShift(
        Guid shiftId,
        [FromBody] CloseShiftRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var cashierId = GetCurrentUserId();
        if (!cashierId.HasValue)
            return Unauthorized();

        var shift = await dbContext.ShiftSessions
            .GetByTenant(tenantId.Value)
            .FirstOrDefaultAsync(x => x.Id == shiftId, cancellationToken);

        if (shift is null)
            return ApiFailure(StatusCodes.Status404NotFound, "Shift not found.", "pos.shift_not_found");

        if (shift.CashierId != cashierId.Value)
            return Forbid();

        if (shift.Status == ShiftStatus.Closed)
            return ApiFailure(StatusCodes.Status409Conflict, "Shift is already closed.", "pos.shift_already_closed");

        shift.Status = ShiftStatus.Closed;
        shift.ClosedAtUtc = DateTime.UtcNow;
        shift.CountedCash = request.CountedCash;
        shift.Notes = string.IsNullOrWhiteSpace(request.Notes) ? shift.Notes : request.Notes.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(shift.Adapt<ShiftSessionResponse>());
    }

    /// <summary>
    /// Returns the current open shift for the authenticated cashier, or 404 if none.
    /// </summary>
    [HttpGet("shifts/current")]
    [Authorize(Policy = AppPermissions.Pos.Checkout)]
    public async Task<ActionResult<ShiftSessionResponse>> GetCurrentShift(CancellationToken cancellationToken)
    {
        var tenantId = currentTenantProvider.TenantId;
        if (!tenantId.HasValue)
            return ApiFailure(StatusCodes.Status400BadRequest, "Tenant context is required.", "tenant.context_required");

        var cashierId = GetCurrentUserId();
        if (!cashierId.HasValue)
            return Unauthorized();

        var shift = await dbContext.ShiftSessions
            .GetByTenant(tenantId.Value)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.CashierId == cashierId.Value && x.Status == ShiftStatus.Open, cancellationToken);

        if (shift is null)
            return ApiFailure(StatusCodes.Status404NotFound, "No open shift was found for the current cashier.", "pos.open_shift_not_found");

        return Ok(shift.Adapt<ShiftSessionResponse>());
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
