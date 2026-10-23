using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VexorionERP.Contracts;
using VexorionERP.Handler;
using VexorionERP.Services;

namespace VexorionERP;

[ApiController]
[Route("api/auth")]
public class AuthController(IMediator mediator, IPasswordResetService passwordResetService) : ServiceResultControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await mediator.Send(new LoginCommand(request));
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("password-reset")]
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        await passwordResetService.RequestResetAsync(request, HttpContext.RequestAborted);
        return Accepted();
    }

    [AllowAnonymous]
    [EnableRateLimiting("password-reset")]
    [HttpPost("reset-password/validate")]
    public async Task<ActionResult> ValidateResetToken([FromBody] ResetTokenRequest request)
    {
        var result = await passwordResetService.ValidateTokenAsync(request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("password-reset")]
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] CompletePasswordResetRequest request)
    {
        var result = await passwordResetService.CompleteResetAsync(request, HttpContext.RequestAborted);
        return ToActionResult(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var result = await mediator.Send(new RefreshTokenCommand(request));
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var result = await mediator.Send(new GetCurrentUserQuery());
        return ToActionResult(result);
    }

    [Authorize]
    [HttpGet("permissions")]
    public async Task<ActionResult<PermissionListResponse>> Permissions()
    {
        var result = await mediator.Send(new GetPermissionsQuery());
        return ToActionResult(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public ActionResult Logout()
    {
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout-refresh")]
    public async Task<ActionResult> LogoutRefresh([FromBody] RefreshTokenRequest request)
    {
        var result = await mediator.Send(new LogoutRefreshCommand(request));
        return ToActionResult(result);
    }

    [Authorize]
    [HttpPost("revoke-sessions")]
    public async Task<ActionResult> RevokeSessions()
    {
        var result = await mediator.Send(new RevokeSessionsCommand());
        return ToActionResult(result);
    }
}
