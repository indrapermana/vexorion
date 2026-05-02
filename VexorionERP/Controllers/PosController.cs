using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VexorionERP.Contracts;
using VexorionERP.Database;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/pos")]
[Authorize]
public class PosController(AppDbContext dbContext, ICurrentTenantProvider currentTenantProvider) : ControllerBase
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
            return BadRequest("Tenant context is required.");
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
}
