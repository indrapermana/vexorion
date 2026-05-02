using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VexorionERP.Contracts;
using VexorionERP.Models;

namespace VexorionERP;

[ApiController]
[Route("api/pos")]
[Authorize]
public class PosController : ControllerBase
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
}
